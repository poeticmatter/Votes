import { hexAt, residenceSiteKey, TOWN_IDS, townsOneStopAway } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import type { Tile } from './types'

// A city is a group of connected tiles and Stations. Each starts as one town, a
// starting Residence and its Station, and grows by tiles placed next to it. Two cities
// are one the moment a tile connects them, so cities are never stored: they are read
// off the tiles. A city is named by its towns, the ones whose starting Residence it
// holds, in alphabetical order. Two cities are neighbors if any of their Stations are
// one stop apart by rail.

export interface Cities {
  /** Every city, ordered by its first town. */
  list: TownId[][]
  /** The city holding the tile at each key. */
  byHex: ReadonlyMap<HexKey, TownId[]>
}

function connectedGroups(tiles: Record<HexKey, Tile>, ignored: HexKey | null): HexKey[][] {
  const unvisited = new Set(Object.keys(tiles).filter(key => key !== ignored))
  const groups: HexKey[][] = []
  for (const start of TOWN_IDS.map(residenceSiteKey)) {
    if (!unvisited.has(start)) continue
    const group = [start]
    unvisited.delete(start)
    for (let next = 0; next < group.length; next += 1) {
      for (const { key } of hexAt(group[next]).neighbors) {
        if (!unvisited.delete(key)) continue
        group.push(key)
      }
    }
    groups.push(group)
  }
  // Every placed tile touches another, so it reaches a starting Residence.
  if (unvisited.size > 0) throw new Error(`Tiles at ${[...unvisited].join(', ')} connect to no town`)
  return groups
}

function citiesOfTiles(tiles: Record<HexKey, Tile>, ignored: HexKey | null): Cities {
  const homeKeys = TOWN_IDS.map(town => [town, residenceSiteKey(town)] as const)
  const byHex = new Map<HexKey, TownId[]>()
  const list = connectedGroups(tiles, ignored).map(group => {
    const members = new Set(group)
    const city = homeKeys.filter(([, home]) => members.has(home)).map(([town]) => town)
    for (const key of group) byHex.set(key, city)
    return city
  })
  return { list: list.sort((a, b) => a[0].localeCompare(b[0])), byHex }
}

// States are immutable, so a tiles object always gives the same cities.
const cache = new WeakMap<Record<HexKey, Tile>, Cities>()

/** The cities on the board. */
export function citiesOnBoard(tiles: Record<HexKey, Tile>): Cities {
  const known = cache.get(tiles)
  if (known) return known
  const cities = citiesOfTiles(tiles, null)
  cache.set(tiles, cities)
  return cities
}

/** The cities as they were before a tile was placed at `placedAt`, which may not be on the board yet. */
export function citiesWithout(tiles: Record<HexKey, Tile>, placedAt: HexKey): Cities {
  return citiesOfTiles(tiles, placedAt)
}

/** Whether any Station of `a` is one stop by rail from a Station of `b`. */
export function areNeighborCities(a: TownId[], b: TownId[]): boolean {
  return a.some(town => townsOneStopAway(town).some(next => b.includes(next)))
}
