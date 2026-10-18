import { IllegalMoveError } from 'game-kit/turns'
import { hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { addVotes } from './bag'
import { activePlayerState, peopleAt, tilesInBoardOrder } from './boardQueries'
import { isSameMove, movePerson, movesFrom } from './people'
import type { PersonMove, VotesState } from './types'

// A School's relocation: the active player moves 1 person from anywhere on the board
// (a Residence or a Station) into each Residence next to the School, even a full one,
// in whatever order they like. Each person moved in is a vote: the active player adds
// 1 of their cubes to the bag. So is each Residence next to the School that touches no
// other School, counted when the School is placed.

/** Residences next to `at`, of any colour or town. */
export function residencesNextTo(state: VotesState, at: HexKey): HexKey[] {
  return hexAt(at)
    .neighbors.filter(({ key }) => state.tiles[key]?.kind === 'residence')
    .map(({ key }) => key)
}

function touchesSchoolOtherThan(state: VotesState, residence: HexKey, school: HexKey): boolean {
  return hexAt(residence).neighbors.some(({ key }) => key !== school && state.tiles[key]?.kind === 'school')
}

/** The School at `at`'s own votes: Residences next to it that touch no other School. */
export function schoolVotes(state: VotesState, at: HexKey): number {
  return residencesNextTo(state, at).filter(residence => !touchesSchoolOtherThan(state, residence, at)).length
}

function addSchoolVotes(state: VotesState, at: HexKey): VotesState {
  const count = schoolVotes(state, at)
  if (count === 0) return state
  const logged: VotesState = {
    ...state,
    log: [...state.log, { kind: 'schoolVotes', turn: state.turn.number, player: activePlayerState(state).color, count }],
  }
  return addVotes(logged, count)
}

/** Starts this turn's relocation; it owes nothing unless the tile is a School. */
export function beginRelocation(state: VotesState): VotesState {
  const at = state.turn.placedAt
  if (!at || state.tiles[at]?.kind !== 'school') return { ...state, phase: { kind: 'relocation', residences: [] } }
  return { ...addSchoolVotes(state, at), phase: { kind: 'relocation', residences: residencesNextTo(state, at) } }
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
  const voter = activePlayerState(state).color
  return addVotes(
    {
      ...moved,
      phase: { kind: 'relocation', residences: phase.residences.filter(key => key !== move.to) },
      log: [...moved.log, { kind: 'relocated', turn: state.turn.number, ...move, voter }],
    },
    1,
  )
}
