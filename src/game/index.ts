import type { GameModule } from '../platform/types'
import { votesRules } from './rules'
import { DEFAULT_SETTINGS } from './rules/setup'
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS, type VotesMove, type VotesSettings, type VotesState } from './rules/types'
import { VotesSettingsForm } from './SettingsForm'
import { VotesBoard } from './ui/Board'
import { PIECE_COLORS } from './ui/pieceColors'

/** Votes, plugged into the platform. Seat i plays PLAYER_COLORS[i]. */
export const game: GameModule<VotesSettings, VotesState, VotesMove> = {
  rules: votesRules,
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  defaultSettings: DEFAULT_SETTINGS,
  playerAppearance: index => {
    const { name, fill } = PIECE_COLORS[PLAYER_COLORS[index]]
    return { name, color: fill }
  },
  SettingsForm: VotesSettingsForm,
  Board: VotesBoard,
}

export type GameSettings = VotesSettings
export type GameState = VotesState
export type GameMove = VotesMove
