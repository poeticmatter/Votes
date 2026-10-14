import type { ComponentType } from 'react'

/**
 * Contracts between the game-agnostic platform (lobby, transports, screens) and a game
 * in src/game/. The platform only ever sees a game through {@link GameModule}.
 */

export type PlayerSlot = 1 | 2

export type UserRole = PlayerSlot | 'spectator'

/** How the two players of an online match are connected. */
export type Transport = 'live' | 'async'

/** What the lobby offers: an online transport, or both players sharing this device. */
export type PlayMode = Transport | 'hot_seat'

/**
 * Who is looking at the board. In a hot-seat match both players read the same screen,
 * so the board should name players by number rather than calling one of them "You".
 */
export type Seating = 'remote' | 'hot_seat'

export type ConnectionStatus =
  | 'connecting'
  | 'waiting_for_partner'
  | 'playing'
  | 'spectating'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

/** Every game state carries a turn counter; transports use it to reject stale plans. */
export interface TurnBasedState {
  turn: number
}

/** Every plan is stamped with the turn it was made for. */
export interface TurnPlan {
  turn: number
}

/**
 * Pure game rules. Both players commit a plan simultaneously, then
 * {@link GameRules.resolveTurn} produces the next state. Must be deterministic: in async
 * play two clients may resolve the same turn and must agree on the result.
 */
export interface GameRules<Settings, State extends TurnBasedState, Plan extends TurnPlan> {
  createInitialState(settings: Settings): State
  resolveTurn(state: State, p1Plan: Plan, p2Plan: Plan): State
}

export interface SettingsFormProps<Settings> {
  settings: Settings
  onChange: (settings: Settings) => void
}

export interface BoardProps<State, Plan> {
  state: State
  role: UserRole
  /** True once this player has committed a plan for the current turn. */
  hasCommitted: boolean
  onSubmitPlan: (plan: Plan) => void
  seating: Seating
}

export interface GameModule<Settings, State extends TurnBasedState, Plan extends TurnPlan> {
  rules: GameRules<Settings, State, Plan>
  defaultSettings: Settings
  SettingsForm: ComponentType<SettingsFormProps<Settings>>
  Board: ComponentType<BoardProps<State, Plan>>
}

/** The surface every transport hook returns, so the match screen is transport-agnostic. */
export interface MatchConnection<State, Plan> {
  state: State | null
  role: UserRole
  status: ConnectionStatus
  errorMessage: string | null
  hasCommitted: boolean
  spectatorCount: number
  submitPlan: (plan: Plan) => void
}
