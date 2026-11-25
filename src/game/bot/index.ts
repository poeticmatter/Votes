import type { GameBot } from 'game-kit/turns'
import { legalMoves } from '../rules/legalMoves'
import type { PlayerColor, Pull, VotesMove, VotesState } from '../rules/types'
import { BAG_CUBE_VALUE, placementValue } from './placementValues'
import { personMoveValue } from './seatValues'

// A heuristic bot: it values each legal move by what it does to the board as it stands
// and plays the best, without looking further ahead. Equal moves go to the first in the
// rules' own order, so every browser playing the bot picks the same move; ending the
// turn comes first among the pulls, so the bot pulls only while a pull gains it something.

/** One cube going into the bag: the bot's own is worth having there, a rival's costs a little. */
const bagCubeValue = (color: string | null, me: PlayerColor): number => {
  if (color === null) return 0
  return color === me ? BAG_CUBE_VALUE : -BAG_CUBE_VALUE / 2
}

/** A pull's seats, and the cubes it puts in the bag: the Factory owner's and the credited School owner's. */
function pullValue(state: VotesState, move: Pull, me: PlayerColor): number {
  const source = state.tiles[move.from]
  const factoryCube = source?.kind === 'factory' ? (source.owner ?? 'grey') : null
  return personMoveValue(state, move, me) + bagCubeValue(factoryCube, me) + bagCubeValue(move.credit, me)
}

function moveValue(state: VotesState, move: VotesMove, me: PlayerColor): number {
  switch (move.kind) {
    case 'place':
      return placementValue(state, move.tile, move.at, me)
    case 'pass':
    case 'endTurn':
      return 0
    case 'pull':
      return pullValue(state, move, me)
  }
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
