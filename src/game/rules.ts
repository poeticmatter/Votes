import type { GameRules, PlayerSlot } from '../platform/types'
import type { Hand, RpsPlan, RpsSettings, RpsState } from './types'

const BEATS: Record<Hand, Hand> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
}

function decideRound(p1Hand: Hand, p2Hand: Hand): PlayerSlot | null {
  if (p1Hand === p2Hand) return null
  return BEATS[p1Hand] === p2Hand ? 1 : 2
}

function awardPoint(scores: RpsState['scores'], winner: PlayerSlot | null): RpsState['scores'] {
  if (winner === null) return scores
  return { ...scores, [winner]: scores[winner] + 1 }
}

export const rpsRules: GameRules<RpsSettings, RpsState, RpsPlan> = {
  createInitialState(settings) {
    return {
      turn: 1,
      targetScore: settings.targetScore,
      scores: { 1: 0, 2: 0 },
      lastRound: null,
      matchWinner: null,
    }
  },

  resolveTurn(state, p1Plan, p2Plan) {
    if (state.matchWinner !== null) return state

    const winner = decideRound(p1Plan.hand, p2Plan.hand)
    const scores = awardPoint(state.scores, winner)
    const matchWinner = winner !== null && scores[winner] >= state.targetScore ? winner : null

    return {
      ...state,
      turn: state.turn + 1,
      scores,
      lastRound: { p1Hand: p1Plan.hand, p2Hand: p2Plan.hand, winner },
      matchWinner,
    }
  },
}
