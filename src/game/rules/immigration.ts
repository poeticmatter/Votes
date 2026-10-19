import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { drawFromBag } from './bag'
import { bagSize, cityAt, stationsInCity } from './boardQueries'
import { beginHousing } from './housing'
import type { CubeColor, VotesState } from './types'

// Immigration: a new Factory draws people from the bag onto a Station in its city,
// where they wait to be housed. The active player chooses the Station when the city
// has more than one. Nobody pays for a draw, so the bag can run low; once it's empty
// nobody else arrives.

/** Stations a Factory placed this turn may bring people to; none for any other tile. */
export function arrivalStations(state: VotesState): HexKey[] {
  const at = state.turn.placedAt
  if (!at || state.tiles[at]?.kind !== 'factory') return []
  return stationsInCity(state, cityAt(state, at)).map(({ key }) => key)
}

function arriveAt(state: VotesState, station: HexKey): VotesState {
  const tile = state.tiles[station]
  if (tile?.kind !== 'station') throw new Error(`Expected a Station at ${station}`)

  let current = state
  const arrived: CubeColor[] = []
  while (arrived.length < state.factoryArrivals && bagSize(current) > 0) {
    const draw = drawFromBag(current)
    current = draw.state
    arrived.push(draw.color)
  }
  if (arrived.length === 0) return state

  return {
    ...current,
    tiles: { ...current.tiles, [station]: { ...tile, people: [...tile.people, ...arrived] } },
    log: [...current.log, { kind: 'arrived', turn: state.turn.number, station, people: arrived }],
  }
}

/** Starts this turn's immigration, which waits for a choice only when the city has several Stations. */
export function beginImmigration(state: VotesState): VotesState {
  const stations = arrivalStations(state)
  if (stations.length > 1 && bagSize(state) > 0) return { ...state, phase: { kind: 'immigration', stations } }
  return beginHousing(stations.length === 1 ? arriveAt(state, stations[0]) : state)
}

export function arrive(state: VotesState, station: HexKey): VotesState {
  if (state.phase.kind !== 'immigration' || !state.phase.stations.includes(station)) {
    throw new IllegalMoveError(`People can't arrive at ${station}`)
  }
  return beginHousing(arriveAt(state, station))
}
