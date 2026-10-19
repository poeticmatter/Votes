import type { GameRules } from 'game-kit/turns'
import { createInitialState } from './setup'
import { activePlayerIndex, applyMove, drawsFromBag, gameOutcome } from './turnFlow'
import type { VotesMove, VotesSettings, VotesState } from './types'

const DRAW_WARNING = 'This brings people from the bag, drawn at random.'

export const votesRules: GameRules<VotesSettings, VotesState, VotesMove> = {
  createInitialState,
  activePlayer: activePlayerIndex,
  applyMove,
  outcome: gameOutcome,
  irreversibleReason: (state, move) => (drawsFromBag(state, move) ? DRAW_WARNING : null),
}
