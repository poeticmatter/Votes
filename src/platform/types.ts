import type { ComponentType } from 'react'

/**
 * Contracts between the game-agnostic platform (lobby, transports, screens) and a game
 * in src/game/. The platform only ever sees a game through {@link GameModule}.
 *
 * Players take turns in order: the game names whose decision it awaits, and only that
 * player's moves are applied. A turn may take several moves.
 */

/** A seat at the table, 0-based, in the order players joined. */
export type PlayerIndex = number

export type UserRole = PlayerIndex | 'spectator'

/** How the players of an online match are connected. */
export type Transport = 'live' | 'async'

/** What the lobby offers: an online transport, or everyone sharing this device. */
export type PlayMode = Transport | 'hot_seat'

/**
 * Who is looking at the board. In a hot-seat match everyone reads the same screen, so
 * the board should name players rather than calling one of them "You".
 */
export type Seating = 'remote' | 'hot_seat'

export type ConnectionStatus =
  | 'connecting'
  /** Connected, but this browser hasn't taken a seat or chosen to watch yet. */
  | 'choosing_seat'
  | 'waiting_for_players'
  | 'playing'
  | 'spectating'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export interface MatchSetup<Settings> {
  settings: Settings
  playerCount: number
  /** Seeds any randomness, so every client derives the same game. */
  seed: number
}

/** Everything the room's creator knows that nobody else does yet. */
export interface NewMatch<Settings, State> {
  setup: MatchSetup<Settings>
  initialState: State
  hostName: string
}

/**
 * Pure game rules. Must be deterministic: in async play the moving client computes the
 * next state and everyone else trusts the stored result.
 */
export interface GameRules<Settings, State, Move> {
  createInitialState(setup: MatchSetup<Settings>): State
  /** The player whose move the game awaits, or null once it's over. */
  activePlayer(state: State): PlayerIndex | null
  /** Applies the active player's move. Throws IllegalMoveError if it breaks the rules. */
  applyMove(state: State, move: Move): State
}

export interface PlayerProfile {
  name: string
  /** Live play knows who is connected; async play doesn't track it. */
  isOnline?: boolean
}

/** How the platform's own screens show a seat before the game's board appears. */
export interface PlayerAppearance {
  name: string
  color: string
}

export interface SettingsFormProps<Settings> {
  settings: Settings
  playerCount: number
  onChange: (settings: Settings) => void
}

export interface BoardProps<State, Move> {
  state: State
  role: UserRole
  /** In seat order. */
  players: PlayerProfile[]
  onMove: (move: Move) => void
  seating: Seating
}

export interface GameModule<Settings, State, Move> {
  rules: GameRules<Settings, State, Move>
  minPlayers: number
  maxPlayers: number
  defaultSettings: Settings
  playerAppearance(index: PlayerIndex): PlayerAppearance
  SettingsForm: ComponentType<SettingsFormProps<Settings>>
  Board: ComponentType<BoardProps<State, Move>>
}

/** Offered while a browser that opened a room link decides how to take part. */
export interface SeatChoice {
  claimSeat(name: string): void
  /** Takes back a seat this person already holds, e.g. from another device. */
  resumeSeat(index: PlayerIndex): void
  watch(): void
}

/** The surface every transport hook returns, so the match screen is transport-agnostic. */
export interface MatchConnection<State, Move> {
  state: State | null
  role: UserRole
  /** Seats taken so far, in seat order. */
  players: PlayerProfile[]
  /** Null until the match's size is known. */
  playerCount: number | null
  status: ConnectionStatus
  errorMessage: string | null
  /** Non-null only while status is 'choosing_seat'. */
  seatChoice: SeatChoice | null
  submitMove: (move: Move) => void
}
