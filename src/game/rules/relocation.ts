import { IllegalMoveError } from 'game-kit/turns'
import { hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { peopleAt, tilesInBoardOrder } from './boardQueries'
import { isSameMove, movePerson, movesFrom } from './people'
import type { PersonMove, VotesState } from './types'

// A School's relocation: the active player moves 1 person from anywhere on the board
// (a Residence or a Station) into each Residence next to the School, even a full one.
// The Residences go in whatever order the player likes; a Residence across a district
// line is next to it too. Nobody earns cubes for relocation.

/** Residences next to `at`, across a district line or not. */
export function residencesNextTo(state: VotesState, at: HexKey): HexKey[] {
  return hexAt(at)
    .neighbors.filter(({ key }) => state.tiles[key]?.kind === 'residence')
    .map(({ key }) => key)
}

/** Starts this turn's relocation; it owes nothing unless the tile is a School. */
export function beginRelocation(state: VotesState): VotesState {
  const at = state.turn.placedAt
  const residences = at && state.tiles[at]?.kind === 'school' ? residencesNextTo(state, at) : []
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

/** Over once every Residence has its person, or nobody is left elsewhere to move. */
export function isRelocationOver(state: VotesState): boolean {
  return relocationMoves(state).length === 0
}

export function relocate(state: VotesState, move: PersonMove): VotesState {
  const { phase } = state
  if (phase.kind !== 'relocation' || !relocationMoves(state).some(legal => isSameMove(legal, move))) {
    throw new IllegalMoveError(`Can't relocate a ${move.color} person from ${move.from} to ${move.to}`)
  }
  const moved = movePerson(state, move)
  return {
    ...moved,
    phase: { kind: 'relocation', residences: phase.residences.filter(key => key !== move.to) },
    log: [...moved.log, { kind: 'relocated', turn: state.turn.number, color: move.color, from: move.from, to: move.to }],
  }
}
