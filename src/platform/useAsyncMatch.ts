import { useCallback, useEffect, useState } from 'react'
import { SUPABASE_TABLE } from '../game.config'
import { createMatch, loadMatch, markPlayer2Joined, submitPlan as submitPlanRemote, type MatchRow } from './asyncMatchApi'
import { getSupabase, isSupabaseConfigured } from './supabaseClient'
import type { ConnectionStatus, GameRules, MatchConnection, PlayerSlot, TurnBasedState, TurnPlan } from './types'

/**
 * Async (Supabase) transport. No browser has to stay online: the authoritative state
 * lives in this game's table and Realtime pushes updates to anyone watching.
 */

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : 'Connection error.'
}

function deriveStatus(
  row: { p2_joined: boolean } | null,
  slot: PlayerSlot,
  errorMessage: string | null,
): ConnectionStatus {
  if (errorMessage) return 'error'
  if (!row) return 'connecting'
  if (slot === 1 && !row.p2_joined) return 'waiting_for_partner'
  return 'playing'
}

export function useAsyncMatch<Settings, State extends TurnBasedState, Plan extends TurnPlan>(
  roomCode: string,
  slot: PlayerSlot,
  rules: GameRules<Settings, State, Plan>,
  settings: Settings | null,
): MatchConnection<State, Plan> {
  const [row, setRow] = useState<MatchRow<Settings, State, Plan> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setErrorMessage('Async play is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).')
      return
    }

    let isCancelled = false
    const fail = (message: string) => {
      if (!isCancelled) setErrorMessage(message)
    }

    // Subscribe before loading so no update between the two is missed.
    const channel = getSupabase()
      .channel(`${SUPABASE_TABLE}:${roomCode}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: SUPABASE_TABLE, filter: `id=eq.${roomCode}` },
        payload => {
          // Realtime payloads are untyped; this table's rows are only written by asyncMatchApi.
          if (!isCancelled) setRow(payload.new as MatchRow<Settings, State, Plan>)
        },
      )
      .subscribe()

    async function openMatch() {
      // Only the creating tab holds `settings`; everyone else (including a host
      // reopening the link) must find an existing row.
      let existing = await loadMatch<Settings, State, Plan>(roomCode)
      if (!existing && slot === 1 && settings !== null) {
        await createMatch(roomCode, rules, settings)
        existing = await loadMatch<Settings, State, Plan>(roomCode)
      }
      if (!existing) return fail('Game not found. Check the link.')

      if (slot === 2 && !existing.p2_joined) {
        await markPlayer2Joined(roomCode)
        existing = { ...existing, p2_joined: true }
      }
      if (!isCancelled) setRow(existing)
    }

    openMatch().catch(err => fail(describeError(err)))

    return () => {
      isCancelled = true
      getSupabase().removeChannel(channel)
    }
  }, [roomCode, slot, rules, settings])

  const submitPlan = useCallback(
    (plan: Plan) => {
      const planColumn = slot === 1 ? 'p1_plan' : 'p2_plan'
      // Optimistic: show our commit now; Realtime delivers the authoritative row after.
      setRow(prev => (prev ? { ...prev, [planColumn]: plan } : prev))
      submitPlanRemote(roomCode, slot, plan, rules).catch(err => setErrorMessage(describeError(err)))
    },
    [roomCode, slot, rules],
  )

  const myPlan = row ? (slot === 1 ? row.p1_plan : row.p2_plan) : null

  return {
    state: row?.state ?? null,
    role: slot,
    status: deriveStatus(row, slot, errorMessage),
    errorMessage,
    // Plans are cleared on resolution, so a stored plan means "committed this turn",
    // which also survives a page reload.
    hasCommitted: myPlan !== null,
    spectatorCount: 0,
    submitPlan,
  }
}
