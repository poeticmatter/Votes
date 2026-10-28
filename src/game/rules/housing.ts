import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { addVote } from './bag'
import { activePlayerState, cityAt, hasRoom, residences, schoolCities, stations } from './boardQueries'
import { isSameMove, isWithinCity, movePerson, movesFrom } from './people'
import type { PersonMove, VotesState } from './types'

// Housing, every turn: people waiting at Stations move into Residences with space in
// the same city, as many as fit. A city with a School may also take people waiting at
// any Station, or living in a Residence in a city with no School. Housing is mandatory:
// the active player picks who moves where, one person at a time, until nobody can move
// in; a move that is the only one possible happens by itself. People who don't fit keep
// waiting, and move in on a later turn once there's space. A person moves at most twice
// in a turn, from a Station and then into a School city, where nobody leaves, so housing
// always ends.
//
// Votes: the active player adds 1 of their cubes to the bag for each person who moves in.

/** Residences with space for one more. */
function homesWithRoom(state: VotesState): HexKey[] {
  return residences(state)
    .filter(({ tile }) => hasRoom(tile))
    .map(({ key }) => key)
}

export function housingMoves(state: VotesState): PersonMove[] {
  if (state.phase.kind !== 'housing') return []
  const schools = schoolCities(state)
  const hasSchool = (key: HexKey) => schools.has(cityAt(state, key)[0])
  const homes = homesWithRoom(state)
  const schoolHomes = homes.filter(hasSchool)
  // A person waiting at a Station may move into their own city, or into any School city.
  const fromStations = stations(state).flatMap(({ key }) =>
    movesFrom(state, key, homes.filter(home => isWithinCity(state, key, home) || hasSchool(home))),
  )
  // A person living in a city with no School may move into a School city.
  const fromResidences = residences(state)
    .filter(({ key }) => !hasSchool(key))
    .flatMap(({ key }) => movesFrom(state, key, schoolHomes))
  return [...fromStations, ...fromResidences]
}

export function isHousingOver(state: VotesState): boolean {
  return housingMoves(state).length === 0
}

export function beginHousing(state: VotesState): VotesState {
  return { ...state, phase: { kind: 'housing' } }
}

export function house(state: VotesState, move: PersonMove): VotesState {
  if (!housingMoves(state).some(legal => isSameMove(legal, move))) {
    throw new IllegalMoveError(`Can't house a ${move.color} person from ${move.from} in ${move.to}`)
  }
  const moved = movePerson(state, move)
  const voter = activePlayerState(state).color
  const entry = { kind: 'housed' as const, turn: state.turn.number, color: move.color, from: move.from, to: move.to, voter }
  return addVote({ ...moved, log: [...moved.log, entry] })
}

/** Makes housing moves for as long as only one is possible. */
export function houseWhileForced(state: VotesState): VotesState {
  let current = state
  for (let moves = housingMoves(current); moves.length === 1; moves = housingMoves(current)) {
    current = house(current, moves[0])
  }
  return current
}
