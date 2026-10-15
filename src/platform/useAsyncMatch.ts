import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SUPABASE_TABLE } from '../game.config'
import { claimSeat, createMatch, loadMatch, saveMove, type MatchRow } from './asyncMatchApi'
import { applyPlayerMove } from './moveValidation'
import { recallRole, rememberRole } from './roomLink'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import type { ConnectionStatus, GameRules, MatchConnection, NewMatch, PlayerIndex, SeatChoice, UserRole } from './types'

/**
 * Async (Supabase) transport. No browser has to stay online: the authoritative state
 * lives in this game's table and Realtime pushes updates to anyone watching.
 *
 * The active player's client applies each move locally, shows it at once, and queues
 * the write. Writes go out one at a time, each guarded on the version it was computed
 * from; if one is refused, the row is reloaded and the board snaps to what's stored.
 *
 * Realtime delivery is best effort, so the hook also catches up when the tab becomes
 * visible and on a slow poll. Catching up never takes an older version than the one
 * shown, so it can't undo a move that is still being written.
 */

const SAFETY_POLL_MS = 15_000

type Row<Settings, State> = MatchRow<Settings, State>

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) return String(err.message)
  return 'Connection error.'
}

/** A remembered seat only counts if the room actually has that seat filled. */
function validRole(role: UserRole | null, playersSeated: number): UserRole | null {
  if (role === 'spectator') return role
  return role !== null && role < playersSeated ? role : null
}

function deriveStatus(
  row: { players: unknown[]; player_count: number } | null,
  role: UserRole | null,
  errorMessage: string | null,
): ConnectionStatus {
  if (errorMessage) return 'error'
  if (!row) return 'connecting'
  if (role === null) return 'choosing_seat'
  if (row.players.length < row.player_count) return 'waiting_for_players'
  return role === 'spectator' ? 'spectating' : 'playing'
}

export function useAsyncMatch<Settings, State, Move>(
  roomCode: string,
  rules: GameRules<Settings, State, Move>,
  newMatch: NewMatch<Settings, State> | null,
): MatchConnection<State, Move> {
  const [row, setRow] = useState<Row<Settings, State> | null>(null)
  const [storedRole, setStoredRole] = useState<UserRole | null>(() => recallRole(roomCode))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Move submission reads the newest row synchronously, between renders.
  const latestRow = useRef<Row<Settings, State> | null>(null)
  const writeQueue = useRef<Promise<void>>(Promise.resolve())

  const fail = useCallback((err: unknown) => setErrorMessage(describeError(err)), [])

  const showRow = useCallback((next: Row<Settings, State>) => {
    latestRow.current = next
    setRow(next)
  }, [])

  /**
   * Takes an update unless we already show a newer version. Merges, because Realtime
   * may leave out large columns that didn't change. Seat claims keep the version, so
   * an equal version is still news.
   */
  const mergeUnlessOlder = useCallback(
    (incoming: Partial<Row<Settings, State>>, current: Row<Settings, State>) => {
      if ((incoming.version ?? current.version) < current.version) return
      showRow({ ...current, ...incoming })
    },
    [showRow],
  )

  const catchUp = useCallback(async () => {
    const fresh = await loadMatch<Settings, State>(roomCode)
    if (!fresh) return
    if (latestRow.current) mergeUnlessOlder(fresh, latestRow.current)
    else showRow(fresh)
  }, [roomCode, mergeUnlessOlder, showRow])

  /** After a refused write the database is right, whatever we show. */
  const resync = useCallback(async () => {
    const fresh = await loadMatch<Settings, State>(roomCode)
    if (fresh) showRow(fresh)
  }, [roomCode, showRow])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setErrorMessage('Async play is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).')
      return
    }

    let isCancelled = false
    const failUnlessCancelled = (err: unknown) => !isCancelled && fail(err)
    const catchUpQuietly = () => !isCancelled && catchUp().catch(failUnlessCancelled)

    // Subscribe before loading so no update between the two is missed.
    const channel = getSupabase()
      .channel(`${SUPABASE_TABLE}:${roomCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: SUPABASE_TABLE, filter: `id=eq.${roomCode}` }, payload => {
        if (isCancelled) return
        // An update that beats the first load: load again so it isn't lost.
        if (!latestRow.current) return void catchUpQuietly()
        // Realtime payloads are untyped; this table's rows are only written by asyncMatchApi.
        mergeUnlessOlder(payload.new as Partial<Row<Settings, State>>, latestRow.current)
      })
      // After a dropped connection, catch up on anything missed while away.
      .subscribe(status => status === 'SUBSCRIBED' && latestRow.current && catchUpQuietly())

    async function openMatch() {
      // Only the creating tab holds `newMatch`; everyone else must find an existing row.
      let existing = await loadMatch<Settings, State>(roomCode)
      if (!existing && newMatch) {
        await createMatch(roomCode, newMatch)
        existing = await loadMatch<Settings, State>(roomCode)
      }
      if (!existing) throw new Error('Game not found. Check the link.')
      if (!isCancelled) showRow(existing)
    }
    openMatch().catch(failUnlessCancelled)

    // Phones suspend background tabs; refresh when the player comes back.
    const catchUpWhenVisible = () => document.visibilityState === 'visible' && catchUpQuietly()
    document.addEventListener('visibilitychange', catchUpWhenVisible)
    const safetyPoll = setInterval(catchUpWhenVisible, SAFETY_POLL_MS)

    return () => {
      isCancelled = true
      clearInterval(safetyPoll)
      document.removeEventListener('visibilitychange', catchUpWhenVisible)
      getSupabase().removeChannel(channel)
    }
  }, [roomCode, newMatch, fail, catchUp, mergeUnlessOlder, showRow])

  const role = row ? validRole(storedRole, row.players.length) : storedRole

  const chooseRole = useCallback(
    (chosen: UserRole) => {
      rememberRole(roomCode, chosen)
      setStoredRole(chosen)
    },
    [roomCode],
  )

  const seatChoice = useMemo<SeatChoice>(
    () => ({
      claimSeat: name => {
        claimSeat(roomCode, name)
          .then(async seat => {
            // Load the new seat list first, so the seat is valid the moment it's chosen.
            await catchUp()
            // The last seat went to someone else first; watch instead.
            chooseRole(seat ?? 'spectator')
          })
          .catch(fail)
      },
      resumeSeat: (index: PlayerIndex) => chooseRole(index),
      watch: () => chooseRole('spectator'),
    }),
    [roomCode, chooseRole, catchUp, fail],
  )

  const submitMove = useCallback(
    (move: Move) => {
      const current = latestRow.current
      if (!current || typeof role !== 'number') return
      const nextState = applyPlayerMove(rules, current.state, role, move)
      if (nextState === null) return

      const fromVersion = current.version
      showRow({ ...current, state: nextState, version: fromVersion + 1 })
      writeQueue.current = writeQueue.current
        .then(async () => {
          if (await saveMove(roomCode, fromVersion, nextState)) return
          console.warn(`Move on version ${fromVersion} of room ${roomCode} was refused as stale; reloading.`)
          await resync()
        })
        .catch(fail)
    },
    [roomCode, rules, role, showRow, resync, fail],
  )

  const status = deriveStatus(row, role, errorMessage)
  return {
    state: row?.state ?? null,
    role: role ?? 'spectator',
    players: row?.players ?? [],
    playerCount: row?.player_count ?? null,
    status,
    errorMessage,
    seatChoice: status === 'choosing_seat' ? seatChoice : null,
    submitMove,
  }
}
