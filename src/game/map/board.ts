import { edgeKey, hexKey, neighborOf, SIDES, type EdgeRef, type HexCoord, type HexKey, type HexSide } from './hexGrid'
import { GRID, MOUNTAINS, RAIL, STARTING_FACTORIES, TOWN_SITES, type TownId } from './mapData'

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
  /** A Factory is printed here and is on the board from the start. */
  hasStartingFactory: boolean
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

/** The keys of every town's Residence and Station. */
const townSiteKeys = (): Set<HexKey> => new Set(TOWN_IDS.flatMap(town => [residenceSiteKey(town), stationKeyOf(town)]))

/** Throws unless every printed Factory sits on an open hex beside a town's Residence or Station. */
function checkStartingFactories(): void {
  const sites = townSiteKeys()
  for (const coord of STARTING_FACTORIES) {
    const key = coordKey(coord)
    if (terrainAt(key) !== 'open') throw new Error(`The Factory printed at ${key} isn't on an open hex.`)
    if (sites.has(key)) throw new Error(`The Factory printed at ${key} is on a town site.`)
    if (!neighborsOf(...coord).some(neighbor => sites.has(neighbor.key))) {
      throw new Error(`The Factory printed at ${key} doesn't touch a town, so it would belong to no city.`)
    }
  }
}

/** Throws unless every town's Residence and Station sit on open hexes, side by side, with the Station on the rail. */
function checkTownSites(): void {
  const railEdgeKeys = edgeKeysOf(RAIL)
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
    const [stationCol, stationRow] = TOWN_SITES[town].station
    if (!SIDES.some(side => railEdgeKeys.has(edgeKey(stationCol, stationRow, side)))) {
      throw new Error(`Town ${town}'s Station ${station} isn't on the rail.`)
    }
  }
}

function buildBoard() {
  checkTownSites()
  checkStartingFactories()
  const startingFactoryKeys = new Set(STARTING_FACTORIES.map(coordKey))
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
        hasStartingFactory: startingFactoryKeys.has(key),
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
