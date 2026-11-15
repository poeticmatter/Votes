import type { GameBot } from 'game-kit/turns'
import { legalMoves } from '../rules/legalMoves'
import type { PlayerColor, VotesMove, VotesState } from '../rules/types'
import { actionValue } from './actionValues'
import { arrivalValue, personMoveValue } from './seatValues'

// A heuristic bot: it values each legal move by what it does to the board as it stands
// and plays the best, without looking further ahead. Equal moves go to the first in the
// rules' own order, so every browser playing the bot picks the same move.

function moveValue(state: VotesState, move: VotesMove, me: PlayerColor): number {
  const { phase } = state
  if (move.kind === 'arrive') {
    if (phase.kind !== 'arrival') throw new Error('An arrive move needs the arrival phase')
    return arrivalValue(state, move.residence, phase.person, me)
  }
  if (move.kind === 'move') return personMoveValue(state, move, me)
  return actionValue(state, move, me)
}

export function chooseBotMove(state: VotesState, seat: number): VotesMove {
  const me = state.players[seat].color
  const moves = legalMoves(state)
  if (moves.length === 0) throw new Error(`Seat ${seat + 1} has no move in the ${state.phase.kind} phase`)
  let best = moves[0]
  let bestValue = moveValue(state, best, me)
  for (const move of moves.slice(1)) {
    const value = moveValue(state, move, me)
    if (value > bestValue) {
      best = move
      bestValue = value
    }
  }
  return best
}

export const votesBot: GameBot<VotesState, VotesMove> = { chooseMove: chooseBotMove }
