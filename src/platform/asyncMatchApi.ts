import { SUPABASE_CLAIM_SEAT_FUNCTION, SUPABASE_TABLE } from '../game.config'
import { getSupabase } from './supabaseClient'
import type { NewMatch, PlayerIndex, PlayerProfile } from './types'

/**
 * Database I/O for async play. The table stores data only: the active player's client
 * applies each move with the game's pure rules and writes the resulting state.
 *
 * Error policy: every Supabase `error` is thrown; useAsyncMatch is the handling
 * boundary. A missing row on {@link loadMatch} is normal and returns null.
 */

export interface MatchRow<Settings, State> {
  id: string
  settings: Settings
  player_count: number
  players: PlayerProfile[]
  state: State
  /** Counts applied moves; guards every state write. */
  version: number
}

/**
 * Creates the match row with the host in seat 0, unless it already exists. Idempotent,
 * so a double-invoked effect (React StrictMode) or a host reopening the link can't
 * reset a game.
 */
export async function createMatch<Settings, State>(code: string, match: NewMatch<Settings, State>): Promise<void> {
  const { error } = await getSupabase()
    .from(SUPABASE_TABLE)
    .upsert(
      {
        id: code,
        settings: match.setup.settings,
        player_count: match.setup.playerCount,
        players: [{ name: match.hostName }],
        state: match.initialState,
        version: 0,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  if (error) throw error
}

export async function loadMatch<Settings, State>(code: string): Promise<MatchRow<Settings, State> | null> {
  const { data, error } = await getSupabase().from(SUPABASE_TABLE).select('*').eq('id', code).maybeSingle()
  if (error) throw error
  // The client is untyped (no generated schema); rows are only ever written by this module.
  return data as MatchRow<Settings, State> | null
}

/** Takes the next free seat. Returns null when the room is full or doesn't exist. */
export async function claimSeat(code: string, name: string): Promise<PlayerIndex | null> {
  const { data, error } = await getSupabase().rpc(SUPABASE_CLAIM_SEAT_FUNCTION, { room_id: code, player_name: name })
  if (error) throw error
  return typeof data === 'number' ? data : null
}

/**
 * Stores the state after one move, guarded on the version it was computed from.
 * Returns false when the stored version has moved on, so nothing was written.
 */
export async function saveMove<State>(code: string, fromVersion: number, nextState: State): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from(SUPABASE_TABLE)
    .update({ state: nextState, version: fromVersion + 1, updated_at: new Date().toISOString() })
    .eq('id', code)
    .eq('version', fromVersion)
    .select('version')
  if (error) throw error
  return data.length > 0
}
