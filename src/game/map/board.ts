import { hexKey, neighborOf, SIDES, type HexCoord, type HexKey, type HexSide } from './hexGrid'
import { GRID, MOUNTAINS, STARTING_FACTORIES, TOWN_SITES, type TownId } from './mapData'

// Everything derived from mapData.ts: terrain lookup, town sites and adjacency.

export type Terrain = 'open' | 'mountain'

export interface HexNeighbor {
  side: HexSide
  key: HexKey
}

export interface BoardHex {
  col: number
  row: number
  key: HexKey
  terrain: Terrain
  /** The town whose starting Residence goes here at setup, if any. */
  residenceSite: TownId | null
  /** A Factory is printed here and is on the board from the start. */
  hasStartingFactory: boolean
  /** On-map neighbours, in {@link SIDES} order. */
  neighbors: HexNeighbor[]
}

export const TOWN_IDS = Object.keys(TOWN_SITES) as TownId[]

const coordKey = ([col, row]: HexCoord): HexKey => hexKey(col, row)

export function residenceSiteKey(town: TownId): HexKey {
  return coordKey(TOWN_SITES[town].residence)
}

function isOnMap(col: number, row: number): boolean {
  return col >= 0 && col < GRID.columns && row >= 0 && row < GRID.rows
}

const MOUNTAIN_KEYS = new Set(MOUNTAINS.map(coordKey))

function terrainAt(key: HexKey): Terrain {
  return MOUNTAIN_KEYS.has(key) ? 'mountain' : 'open'
}

function neighborsOf(col: number, row: number): HexNeighbor[] {
  return SIDES.flatMap(side => {
    const [nextCol, nextRow] = neighborOf(col, row, side)
    return isOnMap(nextCol, nextRow) ? [{ side, key: hexKey(nextCol, nextRow) }] : []
  })
}

/** Throws unless every printed Factory sits on an open hex beside a town's starting Residence. */
function checkStartingFactories(): void {
  const sites = new Set(TOWN_IDS.map(residenceSiteKey))
  for (const coord of STARTING_FACTORIES) {
    const key = coordKey(coord)
    if (terrainAt(key) !== 'open') throw new Error(`The Factory printed at ${key} isn't on an open hex.`)
    if (sites.has(key)) throw new Error(`The Factory printed at ${key} is on a town site.`)
    if (!neighborsOf(...coord).some(neighbor => sites.has(neighbor.key))) {
      throw new Error(`The Factory printed at ${key} doesn't touch a town, so it would belong to no city.`)
    }
  }
}

/** Throws unless every town's starting Residence sits on an open hex. */
function checkTownSites(): void {
  for (const town of TOWN_IDS) {
    const residence = residenceSiteKey(town)
    if (terrainAt(residence) !== 'open') throw new Error(`Town ${town}'s site ${residence} isn't on an open hex.`)
  }
}

function buildBoard() {
  checkTownSites()
  checkStartingFactories()
  const startingFactoryKeys = new Set(STARTING_FACTORIES.map(coordKey))
  const residenceSiteByKey = new Map(TOWN_IDS.map(town => [residenceSiteKey(town), town] as const))

  const hexes: BoardHex[] = []
  for (let col = 0; col < GRID.columns; col += 1) {
    for (let row = 0; row < GRID.rows; row += 1) {
      const key = hexKey(col, row)
      hexes.push({
        col,
        row,
        key,
        terrain: terrainAt(key),
        residenceSite: residenceSiteByKey.get(key) ?? null,
        hasStartingFactory: startingFactoryKeys.has(key),
        neighbors: neighborsOf(col, row),
      })
    }
  }

  return {
    grid: GRID,
    hexes,
    hexByKey: new Map(hexes.map(hex => [hex.key, hex])),
  }
}

export const BOARD = buildBoard()

/** Looks up a hex that must exist; a missing key means corrupt state or a bug. */
export function hexAt(key: HexKey): BoardHex {
  const hex = BOARD.hexByKey.get(key)
  if (!hex) throw new Error(`No hex ${key} on the map`)
  return hex
}
