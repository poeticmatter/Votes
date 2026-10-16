import { edgeKey, hexKey, neighborOf, SIDES, type EdgeRef, type HexCoord, type HexKey, type HexSide } from './hexGrid'
import { FORESTS, GRID, LAKES, MOUNTAINS, RAIL_LINES, RIVER, STARTING_FACTORIES, STARTING_RESIDENCES, STATION_SITES, type DistrictId } from './mapData'

// Everything derived from mapData.ts: terrain lookup, districts, rail borders and
// adjacency. Ported from the asset generator's src/map/board.js.

export type Terrain = 'open' | 'mountain' | 'lake' | 'forest'

export interface HexNeighbor {
  side: HexSide
  key: HexKey
}

export interface BoardHex {
  col: number
  row: number
  key: HexKey
  terrain: Terrain
  /** The district whose printed Residence sits here, if any. */
  startingResidence: DistrictId | null
  /** The fewest players at which this hex's printed station site is in use; null without one. */
  stationSiteMinPlayers: number | null
  /** Null only for unbuildable hexes: mountains, lakes and forests. */
  district: DistrictId | null
  railSides: HexSide[]
  bordersRail: boolean
  /** On-map neighbours, in {@link SIDES} order. */
  neighbors: HexNeighbor[]
}

export const DISTRICT_IDS = Object.keys(STARTING_RESIDENCES) as DistrictId[]

function edgeKeysOf(edges: readonly EdgeRef[]): Set<string> {
  return new Set(edges.map(([col, row, side]) => edgeKey(col, row, side)))
}

function isOnMap(col: number, row: number): boolean {
  return col >= 0 && col < GRID.columns && row >= 0 && row < GRID.rows
}

const keysOf = (coords: readonly HexCoord[]) => new Set(coords.map(([col, row]) => hexKey(col, row)))

const UNBUILDABLE: readonly { terrain: Exclude<Terrain, 'open'>; keys: Set<HexKey> }[] = [
  { terrain: 'mountain', keys: keysOf(MOUNTAINS) },
  { terrain: 'lake', keys: keysOf(LAKES) },
  { terrain: 'forest', keys: keysOf(FORESTS) },
]

function terrainAt(key: HexKey): Terrain {
  return UNBUILDABLE.find(({ keys }) => keys.has(key))?.terrain ?? 'open'
}

interface BaseHex {
  col: number
  row: number
  key: HexKey
  terrain: Terrain
}

function buildBaseHexes(): BaseHex[] {
  const hexes: BaseHex[] = []
  for (let col = 0; col < GRID.columns; col += 1) {
    for (let row = 0; row < GRID.rows; row += 1) {
      const key = hexKey(col, row)
      hexes.push({ col, row, key, terrain: terrainAt(key) })
    }
  }
  return hexes
}

/**
 * A district is everything reachable from its printed Residence without crossing a
 * rail, the river, or an unbuildable hex. Throws if the map joins two districts.
 */
function assignDistricts(hexByKey: Map<HexKey, BaseHex>, blockingEdgeKeys: Set<string>): Map<HexKey, DistrictId> {
  const districtByKey = new Map<HexKey, DistrictId>()
  for (const districtId of DISTRICT_IDS) {
    const [startCol, startRow] = STARTING_RESIDENCES[districtId]
    const pending: [number, number][] = [[startCol, startRow]]
    districtByKey.set(hexKey(startCol, startRow), districtId)
    while (pending.length) {
      const [col, row] = pending.pop()!
      for (const side of SIDES) {
        const [nextCol, nextRow] = neighborOf(col, row, side)
        const next = hexByKey.get(hexKey(nextCol, nextRow))
        if (next?.terrain !== 'open' || blockingEdgeKeys.has(edgeKey(col, row, side))) continue
        const claimedBy = districtByKey.get(next.key)
        if (claimedBy === districtId) continue
        if (claimedBy) {
          throw new Error(`Districts ${claimedBy} and ${districtId} connect at hex ${next.key}; the map needs a boundary there.`)
        }
        districtByKey.set(next.key, districtId)
        pending.push([nextCol, nextRow])
      }
    }
  }
  return districtByKey
}

function neighborsOf(col: number, row: number): HexNeighbor[] {
  return SIDES.flatMap(side => {
    const [nextCol, nextRow] = neighborOf(col, row, side)
    return isOnMap(nextCol, nextRow) ? [{ side, key: hexKey(nextCol, nextRow) }] : []
  })
}

function buildBoard() {
  const railEdgeKeys = edgeKeysOf(RAIL_LINES.flat())
  const riverEdgeKeys = edgeKeysOf(RIVER)
  const baseHexes = buildBaseHexes()
  const districtByKey = assignDistricts(
    new Map(baseHexes.map(hex => [hex.key, hex])),
    new Set([...railEdgeKeys, ...riverEdgeKeys]),
  )
  const startByKey = new Map(DISTRICT_IDS.map(districtId => [startingResidenceKey(districtId), districtId] as const))
  const printedKeys = new Set([...startByKey.keys(), ...STARTING_FACTORIES.map(([col, row]) => hexKey(col, row))])
  const siteMinPlayersByKey = new Map(STATION_SITES.map(({ at: [col, row], minPlayers }) => [hexKey(col, row), minPlayers]))

  const hexes: BoardHex[] = baseHexes.map(hex => {
    const isOpen = hex.terrain === 'open'
    if (isOpen && !districtByKey.has(hex.key)) {
      throw new Error(`Open hex ${hex.key} isn't in any district; it's walled off from every printed Residence.`)
    }
    const stationSiteMinPlayers = siteMinPlayersByKey.get(hex.key) ?? null
    if (stationSiteMinPlayers !== null && (!isOpen || printedKeys.has(hex.key))) {
      throw new Error(`Station site ${hex.key} isn't on an empty open hex.`)
    }
    const railSides = isOpen ? SIDES.filter(side => railEdgeKeys.has(edgeKey(hex.col, hex.row, side))) : []
    return {
      ...hex,
      startingResidence: startByKey.get(hex.key) ?? null,
      stationSiteMinPlayers,
      district: districtByKey.get(hex.key) ?? null,
      railSides,
      bordersRail: railSides.length > 0,
      neighbors: neighborsOf(hex.col, hex.row),
    }
  })

  return {
    grid: GRID,
    hexes,
    hexByKey: new Map(hexes.map(hex => [hex.key, hex])),
    railLines: RAIL_LINES,
    river: RIVER,
    // Where a rail runs along the river it crosses on a bridge.
    bridges: RIVER.filter(([col, row, side]) => railEdgeKeys.has(edgeKey(col, row, side))),
  }
}

export const BOARD = buildBoard()

/** Looks up a hex that must exist; a missing key means corrupt state or a bug. */
export function hexAt(key: HexKey): BoardHex {
  const hex = BOARD.hexByKey.get(key)
  if (!hex) throw new Error(`No hex ${key} on the map`)
  return hex
}

export function districtOf(key: HexKey): DistrictId {
  const { district } = hexAt(key)
  if (!district) throw new Error(`Hex ${key} is not in a district`)
  return district
}

export function startingResidenceKey(districtId: DistrictId): HexKey {
  const [col, row] = STARTING_RESIDENCES[districtId]
  return hexKey(col, row)
}

export function isStationSiteInUse(hex: BoardHex, playerCount: number): boolean {
  return hex.stationSiteMinPlayers !== null && hex.stationSiteMinPlayers <= playerCount
}
