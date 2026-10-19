import { IllegalMoveError } from 'game-kit/turns'
import { hexAt, townsOneStopAway } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { addVotes } from './bag'
import { activePlayerState, cityAt, hasRoom, residences, stations } from './boardQueries'
import { isSameMove, movePerson, movesFrom } from './people'
import type { PersonMove, VotesState } from './types'

// Housing, every turn: people waiting at Stations move into Residences with space, as
// many as fit. A Residence takes people from any Station in its city, or from a Station
// one stop away along the rail. The active player picks who moves where, one person at a
// time; a move that is the only one possible happens by itself. People who don't fit
// keep waiting, and move in on a later turn once there's space.
//
// Votes: the active player adds 1 of their cubes to the bag for each person housed,
// 1 fewer for each Station in another city that they housed people from this turn.

function townOfStation(station: HexKey): TownId {
  const { stationSite } = hexAt(station)
  if (!stationSite) throw new Error(`${station} isn't a Station site`)
  return stationSite
}

/** Whether `station` sits in a city other than `city`, reaching it by one stop along the rail. */
function isOneStopAway(station: HexKey, city: TownId[]): boolean {
  const town = townOfStation(station)
  return !city.includes(town) && townsOneStopAway(town).some(neighbor => city.includes(neighbor))
}

/** Residences with space for one more that people waiting at `station` may move into. */
export function homesWithRoomFor(state: VotesState, station: HexKey): HexKey[] {
  const town = townOfStation(station)
  return residences(state)
    .filter(({ key, tile }) => {
      if (!hasRoom(tile)) return false
      const city = cityAt(state, key)
      return city.includes(town) || isOneStopAway(station, city)
    })
    .map(({ key }) => key)
}

export function housingMoves(state: VotesState): PersonMove[] {
  if (state.phase.kind !== 'housing') return []
  return stations(state).flatMap(({ key }) => movesFrom(state, key, homesWithRoomFor(state, key)))
}

export function isHousingOver(state: VotesState): boolean {
  return housingMoves(state).length === 0
}

export function beginHousing(state: VotesState): VotesState {
  return { ...state, phase: { kind: 'housing' } }
}

/** Whether the move brings a person from a Station in another city, one stop away. */
export function isRemoteMove(state: VotesState, { from, to }: PersonMove): boolean {
  return isOneStopAway(from, cityAt(state, to))
}

/** Cubes the move earns the active player: 1, but none for the first person from a remote Station this turn. */
export function housingVotes(state: VotesState, move: PersonMove): number {
  if (!isRemoteMove(state, move)) return 1
  const hasHousedFromBefore = state.log.some(
    entry => entry.kind === 'housed' && entry.turn === state.turn.number && entry.from === move.from && entry.isRemote,
  )
  return hasHousedFromBefore ? 1 : 0
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
    isRemote: isRemoteMove(state, move),
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
