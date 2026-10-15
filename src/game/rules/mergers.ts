import { districtOf, hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { DistrictId } from '../map/mapData'
import { cityOf } from './boardQueries'
import type { VotesState } from './types'

// Cities are disjoint, sorted lists of districts, so a city's first district names it.
const isSameCity = (a: DistrictId[], b: DistrictId[]) => a[0] === b[0]

export interface CityJoin {
  /** The other city the tile touches. */
  city: DistrictId[]
  /** The district line where its merger marker goes. */
  between: [HexKey, HexKey]
}

/**
 * Cities other than its own that a tile at `at` touches across a district line. The
 * tile itself needn't be on the board yet, so this also previews a placement.
 */
export function citiesJoinedBy(state: VotesState, at: HexKey): CityJoin[] {
  const ownCity = cityOf(state, districtOf(at))
  const joins: CityJoin[] = []
  for (const { key } of hexAt(at).neighbors) {
    const neighborDistrict = hexAt(key).district
    if (!state.tiles[key] || !neighborDistrict || ownCity.includes(neighborDistrict)) continue
    const city = cityOf(state, neighborDistrict)
    if (!joins.some(join => isSameCity(join.city, city))) joins.push({ city, between: [at, key] })
  }
  return joins
}

/** Joins the cities, puts out one merger marker per city joined, and returns the new city. */
export function mergeCities(state: VotesState, at: HexKey, joins: CityJoin[]): { state: VotesState; city: DistrictId[] } {
  const ownCity = cityOf(state, districtOf(at))
  const absorbed = [ownCity, ...joins.map(join => join.city)]
  const city = absorbed.flat().sort()
  const untouched = state.cities.filter(existing => !absorbed.some(gone => isSameCity(gone, existing)))
  const markers = joins.map((join, index) => ({ number: state.mergers.length + index + 1, between: join.between }))
  return {
    state: {
      ...state,
      cities: [...untouched, city].sort((a, b) => a[0].localeCompare(b[0])),
      mergers: [...state.mergers, ...markers],
    },
    city,
  }
}
