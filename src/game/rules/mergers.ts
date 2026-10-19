import { hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { citiesWithout } from './cities'
import type { VotesState } from './types'

// A tile that touches two or more cities connects them into one. The tile is part of
// the merged city from the moment it is placed, so its turn's housing and immigration
// already use it; the merger step then marks the join and holds the election.

export interface CityJoin {
  /** A city the tile connects to the one it touches first. */
  city: TownId[]
  /** The edge where its merger marker goes. */
  between: [HexKey, HexKey]
}

export interface TouchedCities {
  /** The first city the tile touches, in side order. */
  own: TownId[]
  /** The others, each once. They merge into `own`. */
  joins: CityJoin[]
}

/**
 * The cities a tile at `at` touches, as the board stood before it. The tile needn't be
 * on the board yet, so this also previews a placement.
 */
export function citiesTouchedBy(state: VotesState, at: HexKey): TouchedCities {
  const before = citiesWithout(state.tiles, at).byHex
  const touched: { city: TownId[]; between: [HexKey, HexKey] }[] = []
  for (const { key } of hexAt(at).neighbors) {
    const city = before.get(key)
    if (city && !touched.some(entry => entry.city[0] === city[0])) touched.push({ city, between: [at, key] })
  }
  if (touched.length === 0) throw new Error(`A tile at ${at} touches no city`)
  const [first, ...others] = touched
  return { own: first.city, joins: others.map(({ city, between }) => ({ city, between })) }
}

/** Puts out one merger marker per city joined. */
export function addMergerMarkers(state: VotesState, joins: CityJoin[]): VotesState {
  const markers = joins.map((join, index) => ({ number: state.mergers.length + index + 1, between: join.between }))
  return { ...state, mergers: [...state.mergers, ...markers] }
}
