import { hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { cityOf } from './boardQueries'
import type { VotesState } from './types'

// Cities are disjoint, sorted lists of towns, so a city's first town names it.
const isSameCity = (a: TownId[], b: TownId[]) => a[0] === b[0]

export interface CityJoin {
  /** The other city the tile touches. */
  city: TownId[]
  /** The edge where its merger marker goes. */
  between: [HexKey, HexKey]
}

/**
 * Cities other than its own that a tile of `town` at `at` touches. A tile never touches
 * another town of its own colour, so everything it touches in another city is of a
 * different colour. The tile needn't be on the board yet, so this also previews a
 * placement.
 */
export function citiesJoinedBy(state: VotesState, town: TownId, at: HexKey): CityJoin[] {
  const ownCity = cityOf(state, town)
  const joins: CityJoin[] = []
  for (const { key } of hexAt(at).neighbors) {
    const neighbor = state.tiles[key]
    if (!neighbor || ownCity.includes(neighbor.town)) continue
    const city = cityOf(state, neighbor.town)
    if (!joins.some(join => isSameCity(join.city, city))) joins.push({ city, between: [at, key] })
  }
  return joins
}

/** Joins the cities, puts out one merger marker per city joined, and returns the new city. */
export function mergeCities(state: VotesState, town: TownId, joins: CityJoin[]): { state: VotesState; city: TownId[] } {
  const absorbed = [cityOf(state, town), ...joins.map(join => join.city)]
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
