import { SUPABASE_TABLE } from '../game.config'
import { getSupabase } from './supabaseClient'
import type { GameRules, PlayerSlot, TurnBasedState, TurnPlan } from './types'

/**
 * Database I/O for async play. The table stores data only: turn resolution runs in
 * whichever client submits second, using the same pure rules as live play.
 *
 * Error policy: every Supabase `error` is thrown; useAsyncMatch is the handling
 * boundary. A missing row on {@link loadMatch} is normal and returns null.
 */

export interface MatchRow<Settings, State, Plan> {
  id: string
  settings: Settings
  state: State
  turn: number
  p1_plan: Plan | null
  p2_plan: Plan | null
  p2_joined: boolean
}

/**
 * Creates the match row if it does not already exist. Idempotent, so a double-invoked
 * effect (React StrictMode) or a host reopening the link cannot reset a game.
 */
export async function createMatch<Settings, State extends TurnBasedState, Plan extends TurnPlan>(
  code: string,
  rules: GameRules<Settings, State, Plan>,
  settings: Settings,
): Promise<void> {
  const state = rules.createInitialState(settings)
  const { error } = await getSupabase()
    .from(SUPABASE_TABLE)
    .upsert(
      { id: code, settings, state, turn: state.turn, p2_joined: false },
      { onConflict: 'id', ignoreDuplicates: true },
    )
  if (error) throw error
}

export async function loadMatch<Settings, State, Plan>(
  code: string,
): Promise<MatchRow<Settings, State, Plan> | null> {
  const { data, error } = await getSupabase()
    .from(SUPABASE_TABLE)
    .select('*')
    .eq('id', code)
    .maybeSingle()
  if (error) throw error
  // The client is untyped (no generated schema); rows are only ever written by this module.
  return data as MatchRow<Settings, State, Plan> | null
}

export async function markPlayer2Joined(code: string): Promise<void> {
  const { error } = await getSupabase()
    .from(SUPABASE_TABLE)
    .update({ p2_joined: true })
    .eq('id', code)
  if (error) throw error
}

/**
 * Stores a player's plan, then resolves the turn if both plans are in.
 *
 * Both writes are guarded on the stored `turn`, so a stale submission is a no-op, and
 * when two clients race to resolve the same turn the loser's write matches zero rows.
 * Determinism of `resolveTurn` makes the race harmless either way.
 */
export async function submitPlan<Settings, State extends TurnBasedState, Plan extends TurnPlan>(
  code: string,
  slot: PlayerSlot,
  plan: Plan,
  rules: GameRules<Settings, State, Plan>,
): Promise<void> {
  const planColumn = slot === 1 ? 'p1_plan' : 'p2_plan'
  const { error: writeError } = await getSupabase()
    .from(SUPABASE_TABLE)
    .update({ [planColumn]: plan })
    .eq('id', code)
    .eq('turn', plan.turn)
  if (writeError) throw writeError

  const row = await loadMatch<Settings, State, Plan>(code)
  if (!row || !row.p1_plan || !row.p2_plan || row.turn !== plan.turn) return

  const nextState = rules.resolveTurn(row.state, row.p1_plan, row.p2_plan)
  const { error: resolveError } = await getSupabase()
    .from(SUPABASE_TABLE)
    .update({
      state: nextState,
      turn: nextState.turn,
      p1_plan: null,
      p2_plan: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', code)
    .eq('turn', plan.turn)
  if (resolveError) throw resolveError
}
