import { IllegalMoveError } from 'game-kit/turns'
import { hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { addVote } from './bag'
import { activePlayerState, tilesInBoardOrder } from './boardQueries'
import { isSameMove, movePerson, movesFrom } from './people'
import type { PersonMove, VotesState } from './types'

// A School's relocation: the active player moves 1 person into one Residence next to
// the School that touches no other School, even a full one. The person comes from any
// Residence that touches no School, or from any Station. Like every move into a
// Residence, it earns the active player 1 cube for the bag.

const touchesSchool = (state: VotesState, residence: HexKey, except: HexKey | null = null): boolean =>
  hexAt(residence).neighbors.some(({ key }) => key !== except && state.tiles[key]?.kind === 'school')

/** Residences next to the School at `at` that touch no other School. The School needn't be placed yet. */
export function eligibleResidences(state: VotesState, at: HexKey): HexKey[] {
  return hexAt(at)
    .neighbors.filter(({ key }) => state.tiles[key]?.kind === 'residence' && !touchesSchool(state, key, at))
    .map(({ key }) => key)
}

/** Where a School may take a person from: a Residence touching no School, or a Station. */
export function relocationSources(state: VotesState): HexKey[] {
  return tilesInBoardOrder(state)
    .filter(({ key, tile }) => {
      if (tile.kind === 'station') return tile.people.length > 0
      return tile.kind === 'residence' && tile.people.length > 0 && !touchesSchool(state, key)
    })
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
  if (phase.kind !== 'relocation' || phase.residences.length === 0) return []
  return relocationSources(state).flatMap(from => movesFrom(state, from, phase.residences))
}

/** Over once the person has moved, or nobody can be taken. */
export function isRelocationOver(state: VotesState): boolean {
  return relocationMoves(state).length === 0
}

export function relocate(state: VotesState, move: PersonMove): VotesState {
  if (!relocationMoves(state).some(legal => isSameMove(legal, move))) {
    throw new IllegalMoveError(`Can't relocate a ${move.color} person from ${move.from} to ${move.to}`)
  }
  const moved = movePerson(state, move)
  const voter = activePlayerState(state).color
  const entry = { kind: 'relocated' as const, turn: state.turn.number, color: move.color, from: move.from, to: move.to, voter }
  return addVote({ ...moved, phase: { kind: 'relocation', residences: [] }, log: [...moved.log, entry] })
}
