import { IllegalMoveError } from 'game-kit/turns'
import { hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { addVotes } from './bag'
import { activePlayerState, peopleAt, tilesInBoardOrder } from './boardQueries'
import { isSameMove, movePerson, movesFrom, votesForMove } from './people'
import type { PersonMove, VotesState } from './types'

// A School's relocation: the active player moves 1 person into one Residence next to
// the School that touches no other School, even a full one. The person comes from a
// Residence or Station in that Residence's city or a neighboring one. As in housing, a
// person from within the city earns the active player 1 cube for the bag, and one from
// a neighboring city none.

/** Residences next to the School at `at` that touch no other School. The School needn't be placed yet. */
export function eligibleResidences(state: VotesState, at: HexKey): HexKey[] {
  const touchesOtherSchool = (residence: HexKey) =>
    hexAt(residence).neighbors.some(({ key }) => key !== at && state.tiles[key]?.kind === 'school')
  return hexAt(at)
    .neighbors.filter(({ key }) => state.tiles[key]?.kind === 'residence' && !touchesOtherSchool(key))
    .map(({ key }) => key)
}

/** Starts this turn's relocation; it owes nothing unless the tile is a School. */
export function beginRelocation(state: VotesState): VotesState {
  const at = state.turn.placedAt
  const residences = at && state.tiles[at]?.kind === 'school' ? eligibleResidences(state, at) : []
  return { ...state, phase: { kind: 'relocation', residences } }
}

export function relocationMoves(state: VotesState): PersonMove[] {
  const { phase } = state
  if (phase.kind !== 'relocation') return []
  const sources = tilesInBoardOrder(state)
    .map(({ key }) => key)
    .filter(key => peopleAt(state, key).length > 0)
  return sources.flatMap(from => movesFrom(state, from, phase.residences))
}

/** Over once the person has moved, or nobody is left elsewhere to move. */
export function isRelocationOver(state: VotesState): boolean {
  return relocationMoves(state).length === 0
}

export function relocate(state: VotesState, move: PersonMove): VotesState {
  if (!relocationMoves(state).some(legal => isSameMove(legal, move))) {
    throw new IllegalMoveError(`Can't relocate a ${move.color} person from ${move.from} to ${move.to}`)
  }
  const votes = votesForMove(state, move.from, move.to)
  const moved = movePerson(state, move)
  const voter = activePlayerState(state).color
  const entry = { kind: 'relocated' as const, turn: state.turn.number, color: move.color, from: move.from, to: move.to, voter, votes }
  return addVotes({ ...moved, phase: { kind: 'relocation', residences: [] }, log: [...moved.log, entry] }, votes)
}
