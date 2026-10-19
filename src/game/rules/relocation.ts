import { IllegalMoveError } from 'game-kit/turns'
import { hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { addVotes } from './bag'
import { activePlayerState, peopleAt, tilesInBoardOrder } from './boardQueries'
import { isSameMove, movePerson, movesFrom } from './people'
import type { PersonMove, VotesState } from './types'

// A School's relocation: the active player moves 1 person from anywhere on the board
// (a Residence or a Station) into one Residence next to the School that touches no
// other School, even a full one. The person moved in is a vote: the active player adds
// 1 of their cubes to the bag.

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
  const moved = movePerson(state, move)
  const voter = activePlayerState(state).color
  return addVotes(
    {
      ...moved,
      phase: { kind: 'relocation', residences: [] },
      log: [...moved.log, { kind: 'relocated', turn: state.turn.number, color: move.color, from: move.from, to: move.to, voter }],
    },
    1,
  )
}
