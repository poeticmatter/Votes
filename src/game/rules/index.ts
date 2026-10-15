import type { GameRules } from 'game-kit/turns'
import { createInitialState } from './setup'
import { activePlayerIndex, applyMove } from './turnFlow'
import type { VotesMove, VotesSettings, VotesState } from './types'

export const votesRules: GameRules<VotesSettings, VotesState, VotesMove> = {
  createInitialState,
  activePlayer: activePlayerIndex,
  applyMove,
}
