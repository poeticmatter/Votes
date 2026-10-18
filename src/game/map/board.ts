import { edgeKey, hexKey, neighborOf, SIDES, type EdgeRef, type HexCoord, type HexKey, type HexSide } from './hexGrid'
import { GRID, MOUNTAINS, RAIL, TOWN_SITES, type TownId } from './mapData'

// Everything derived from mapData.ts: terrain lookup, town sites, rail sides and
// adjacency.

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
  /** The town whose printed Station is here, if any. */
  stationSite: TownId | null
  railSides: HexSide[]
  bordersRail: boolean
  /** On-map neighbours, in {@link SIDES} order. */
  neighbors: HexNeighbor[]
}

export const TOWN_IDS = Object.keys(TOWN_SITES) as TownId[]

const coordKey = ([col, row]: HexCoord): HexKey => hexKey(col, row)

export function residenceSiteKey(town: TownId): HexKey {
  return coordKey(TOWN_SITES[town].residence)
}

export function stationKeyOf(town: TownId): HexKey {
  return coordKey(TOWN_SITES[town].station)
}

function edgeKeysOf(edges: readonly EdgeRef[]): Set<string> {
  return new Set(edges.map(([col, row, side]) => edgeKey(col, row, side)))
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

/** Throws unless every town's Residence and Station sit on open hexes, side by side. */
function checkTownSites(): void {
  for (const town of TOWN_IDS) {
    const residence = residenceSiteKey(town)
    const station = stationKeyOf(town)
    for (const key of [residence, station]) {
      if (terrainAt(key) !== 'open') throw new Error(`Town ${town}'s site ${key} isn't on an open hex.`)
    }
    const [col, row] = TOWN_SITES[town].residence
    if (!neighborsOf(col, row).some(neighbor => neighbor.key === station)) {
      throw new Error(`Town ${town}'s Station ${station} isn't beside its Residence ${residence}.`)
    }
  }
}

function buildBoard() {
  checkTownSites()
  const railEdgeKeys = edgeKeysOf(RAIL)
  const residenceSiteByKey = new Map(TOWN_IDS.map(town => [residenceSiteKey(town), town] as const))
  const stationSiteByKey = new Map(TOWN_IDS.map(town => [stationKeyOf(town), town] as const))

  const hexes: BoardHex[] = []
  for (let col = 0; col < GRID.columns; col += 1) {
    for (let row = 0; row < GRID.rows; row += 1) {
      const key = hexKey(col, row)
      const terrain = terrainAt(key)
      const railSides = terrain === 'open' ? SIDES.filter(side => railEdgeKeys.has(edgeKey(col, row, side))) : []
      hexes.push({
        col,
        row,
        key,
        terrain,
        residenceSite: residenceSiteByKey.get(key) ?? null,
        stationSite: stationSiteByKey.get(key) ?? null,
        railSides,
        bordersRail: railSides.length > 0,
        neighbors: neighborsOf(col, row),
      })
    }
  }

  return {
    grid: GRID,
    hexes,
    hexByKey: new Map(hexes.map(hex => [hex.key, hex])),
    rail: RAIL,
  }
}

export const BOARD = buildBoard()

/** Looks up a hex that must exist; a missing key means corrupt state or a bug. */
export function hexAt(key: HexKey): BoardHex {
  const hex = BOARD.hexByKey.get(key)
  if (!hex) throw new Error(`No hex ${key} on the map`)
  return hex
}
