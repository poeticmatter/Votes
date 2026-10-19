import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { addVotes } from './bag'
import { activePlayerState, hasRoom, residences, stations } from './boardQueries'
import { isSameMove, isWithinCity, movePerson, movesFrom, votesForMove } from './people'
import type { PersonMove, VotesState } from './types'

// Housing, every turn: people waiting at Stations move into Residences with space, as
// many as fit, within their city or from a neighboring city. The active player picks who
// moves where, one person at a time; a move that is the only one possible happens by
// itself. People who don't fit keep waiting, and move in on a later turn once there's
// space.
//
// Votes: the active player adds 1 of their cubes to the bag for each person who moves
// in from within the same city, and none for a person from a neighboring city.

/** Residences with space for one more. Who may move into each is up to {@link movesFrom}. */
function residencesWithRoom(state: VotesState): HexKey[] {
  return residences(state)
    .filter(({ tile }) => hasRoom(tile))
    .map(({ key }) => key)
}

export function housingMoves(state: VotesState): PersonMove[] {
  if (state.phase.kind !== 'housing') return []
  const homes = residencesWithRoom(state)
  return stations(state).flatMap(({ key }) => movesFrom(state, key, homes))
}

export function isHousingOver(state: VotesState): boolean {
  return housingMoves(state).length === 0
}

export function beginHousing(state: VotesState): VotesState {
  return { ...state, phase: { kind: 'housing' } }
}

/** Whether the move brings a person from a neighboring city. */
export function isFromNeighbor(state: VotesState, { from, to }: PersonMove): boolean {
  return !isWithinCity(state, from, to)
}

/** Cubes the move earns the active player. */
export function housingVotes(state: VotesState, { from, to }: PersonMove): number {
  return votesForMove(state, from, to)
}

export function house(state: VotesState, move: PersonMove): VotesState {
  if (!housingMoves(state).some(legal => isSameMove(legal, move))) {
    throw new IllegalMoveError(`Can't house a ${move.color} person from ${move.from} in ${move.to}`)
  }
  const votes = housingVotes(state, move)
  const moved = movePerson(state, move)
  const entry = {
    kind: 'housed' as const,
    turn: state.turn.number,
    color: move.color,
    from: move.from,
    to: move.to,
    voter: activePlayerState(state).color,
    isFromNeighbor: isFromNeighbor(state, move),
    votes,
  }
  return addVotes({ ...moved, log: [...moved.log, entry] }, votes)
}

/** Makes housing moves for as long as only one is possible. */
export function houseWhileForced(state: VotesState): VotesState {
  let current = state
  for (let moves = housingMoves(current); moves.length === 1; moves = housingMoves(current)) {
    current = house(current, moves[0])
  }
  return current
}
