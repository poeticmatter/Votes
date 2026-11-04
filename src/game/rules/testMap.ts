import { BOARD, hexAt, residenceSiteKey, TOWN_IDS } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { citiesOnBoard } from './cities'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import type { Tile } from './types'

// Finds places on the map for rules tests to use, so a test says what it needs (a hex
// touching only one tile, a chain of tiles joining two towns) and the map decides where.
// Editing the map then doesn't break the tests, as long as it still has such places.
// Everything here looks at the board as it starts: the towns' tiles and printed Factories.

const startingTiles: Record<HexKey, Tile> = createInitialState({ settings: DEFAULT_SETTINGS, playerCount: 3, seed: 1 }).tiles
const occupiedAtStart = new Set(Object.keys(startingTiles))
const startingCities = citiesOnBoard(startingTiles)

export const startOf = residenceSiteKey

const neighborKeys = (key: HexKey): HexKey[] => hexAt(key).neighbors.map(neighbor => neighbor.key)
const isOpen = (key: HexKey): boolean => hexAt(key).terrain === 'open'
const isFree = (key: HexKey): boolean => isOpen(key) && !occupiedAtStart.has(key)

export function must<T>(found: T | undefined, what: string): T {
  if (found === undefined) throw new Error(`The map has no ${what} for this test to use.`)
  return found
}

/** Every tile of the town's city at the start: its Residence and any printed Factory. */
export function townHexes(town: TownId): HexKey[] {
  return Object.keys(startingTiles).filter(key => startingCities.byHex.get(key)?.[0] === town)
}

/** Free hexes touching the town's tiles and no other town's, in board order. */
export function soloNeighborsOf(town: TownId): HexKey[] {
  const own = new Set(townHexes(town))
  return BOARD.hexes
    .map(hex => hex.key)
    .filter(key => {
      if (!isFree(key)) return false
      const touching = neighborKeys(key).filter(neighbor => occupiedAtStart.has(neighbor))
      return touching.length > 0 && touching.every(neighbor => own.has(neighbor))
    })
}

/** A free hex next to the town's tiles and nothing else. */
export const soloNeighborOf = (town: TownId): HexKey => must(soloNeighborsOf(town)[0], `free hex beside only town ${town}`)

/** A free hex that touches `tile` and no other tile at the start. */
export function hexTouchingOnly(tile: HexKey): HexKey {
  return must(
    BOARD.hexes.map(hex => hex.key).find(key => {
      if (!isFree(key)) return false
      const touching = neighborKeys(key).filter(neighbor => occupiedAtStart.has(neighbor))
      return touching.length === 1 && touching[0] === tile
    }),
    `free hex touching only ${tile}`,
  )
}

/** A free hex touching no tile at all. */
export function hexTouchingNothing(): HexKey {
  return must(
    BOARD.hexes.map(hex => hex.key).find(key => isFree(key) && neighborKeys(key).every(neighbor => !occupiedAtStart.has(neighbor))),
    'free hex touching no tile',
  )
}

/** A mountain beside a town's tile. */
export function mountainNextToTile(): HexKey {
  return must(
    BOARD.hexes.find(hex => hex.terrain === 'mountain' && hex.neighbors.some(neighbor => occupiedAtStart.has(neighbor.key)))?.key,
    'mountain beside a tile',
  )
}

/** Three free hexes beside only the town's tiles, for a test that gives the town more tiles. */
export function townSpots(town: TownId): [HexKey, HexKey, HexKey] {
  const [first, second, third] = soloNeighborsOf(town)
  return [first, second, must(third, `three free hexes beside only town ${town}`)]
}

function shortestPath(starts: HexKey[], isGoal: (key: HexKey) => boolean, isAllowed: (key: HexKey) => boolean): HexKey[] | null {
  const cameFrom = new Map<HexKey, HexKey | null>(starts.filter(isAllowed).map(key => [key, null]))
  const queue = [...cameFrom.keys()]
  for (let next = 0; next < queue.length; next += 1) {
    const key = queue[next]
    if (isGoal(key)) {
      const path: HexKey[] = []
      for (let step: HexKey | null = key; step !== null; step = cameFrom.get(step) ?? null) path.unshift(step)
      return path
    }
    for (const neighbor of neighborKeys(key)) {
      if (cameFrom.has(neighbor) || !isAllowed(neighbor)) continue
      cameFrom.set(neighbor, key)
      queue.push(neighbor)
    }
  }
  return null
}

const touchesAny = (key: HexKey, tiles: Set<HexKey>): boolean => neighborKeys(key).some(neighbor => tiles.has(neighbor))

/**
 * The fewest free hexes that, filled, join towns `a` and `b` into one city without touching
 * any other town: the first touches `a`, the last touches `b` (one hex may touch both).
 */
export function chainBetween(a: TownId, b: TownId): HexKey[] {
  return must(findChain(a, b) ?? undefined, `chain of free hexes from town ${a} to town ${b}`)
}

function findChain(a: TownId, b: TownId): HexKey[] | null {
  const ofA = new Set(townHexes(a))
  const ofB = new Set(townHexes(b))
  const isAllowed = (key: HexKey) =>
    isFree(key) && neighborKeys(key).every(neighbor => !occupiedAtStart.has(neighbor) || ofA.has(neighbor) || ofB.has(neighbor))
  const starts = BOARD.hexes.map(hex => hex.key).filter(key => touchesAny(key, ofA))
  return shortestPath(starts, key => touchesAny(key, ofB), isAllowed)
}

/** Two towns joined by the shortest chain of free hexes, named for what the tests do with them. */
function closestTowns(): [TownId, TownId] {
  const pairs = TOWN_IDS.flatMap((a, index) => TOWN_IDS.slice(index + 1).map((b): [TownId, TownId] => [a, b]))
  const lengths = pairs.map(([a, b]) => findChain(a, b)?.length ?? Infinity)
  return pairs[lengths.indexOf(Math.min(...lengths))]
}

export const [HOME, NEXT] = closestTowns()
/** A third town, in a city of its own. */
export const FAR = must(TOWN_IDS.find(town => town !== HOME && town !== NEXT), 'third town')

/** The chain's hexes except the one at `gap`, which a test places last to join the two towns. */
export const chainWithGap = (chain: HexKey[], gap = Math.floor(chain.length / 2)): { filled: HexKey[]; gap: HexKey } => ({
  filled: chain.filter((_, index) => index !== gap),
  gap: chain[gap],
})

/**
 * Free hexes that make `town` a city whose Residence touches a School placed at `school`,
 * beside a second Residence at `residence`; `rival` is where another School would make that
 * second Residence ineligible while the town's starting Residence stays eligible.
 */
export function schoolLayout(): { town: TownId; school: HexKey; residence: HexKey; rival: HexKey } {
  for (const town of TOWN_IDS) {
    const own = new Set(townHexes(town))
    const start = startOf(town)
    const solo = new Set(soloNeighborsOf(town))
    for (const school of solo) {
      if (!neighborKeys(start).includes(school)) continue
      for (const residence of neighborKeys(school)) {
        if (!solo.has(residence) || !touchesAny(residence, own)) continue
        const rival = neighborKeys(residence).find(
          key => key !== school && solo.has(key) && !neighborKeys(start).includes(key),
        )
        if (rival) return { town, school, residence, rival }
      }
    }
  }
  throw new Error('The map has no place to lay out a School beside two Residences, one next to another School.')
}

/** Free hexes around `hex` for one arm from `town`, none touching another town or `blocked`. */
function armTo(town: TownId, hex: HexKey, blocked: Set<HexKey>): HexKey[] | null {
  const own = new Set(townHexes(town))
  if (neighborKeys(hex).some(neighbor => own.has(neighbor))) return []
  const isAllowed = (key: HexKey) =>
    key !== hex &&
    !blocked.has(key) &&
    isFree(key) &&
    neighborKeys(key).every(neighbor => !occupiedAtStart.has(neighbor) || own.has(neighbor))
  const starts = BOARD.hexes.map(candidate => candidate.key).filter(key => touchesAny(key, own))
  return shortestPath(starts, key => neighborKeys(key).includes(hex), isAllowed)
}

function permutations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]]
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)], size - 1).map(rest => [item, ...rest]),
  )
}

let threeWay: { hex: HexKey; arms: HexKey[]; towns: TownId[] } | undefined

/**
 * A free hex that touches three towns' cities once each of them has an arm of tiles
 * reaching it, with the arms not touching each other: placing a tile there joins all three.
 */
export function threeWayJoin(): { hex: HexKey; arms: HexKey[]; towns: TownId[] } {
  if (threeWay) return threeWay
  for (const hex of BOARD.hexes.map(candidate => candidate.key).filter(isFree)) {
    for (const towns of permutations(TOWN_IDS, 3)) {
      const blocked = new Set<HexKey>([hex])
      const arms: HexKey[] = []
      const isReached = towns.every(town => {
        const arm = armTo(town, hex, blocked)
        if (!arm) return false
        for (const armHex of arm) {
          blocked.add(armHex)
          neighborKeys(armHex).forEach(neighbor => blocked.add(neighbor))
        }
        arms.push(...arm)
        return true
      })
      const ofTowns = new Set(towns.flatMap(townHexes))
      const touchesOnlyThem = neighborKeys(hex).every(neighbor => !occupiedAtStart.has(neighbor) || ofTowns.has(neighbor))
      if (isReached && touchesOnlyThem) {
        threeWay = { hex, arms, towns: [...towns].sort() }
        return threeWay
      }
    }
  }
  throw new Error('The map has no hex where three towns can be joined at once.')
}

let split: { column: number; joining: HexKey } | undefined

/**
 * A column of the map which, left empty while every other open hex is built on, leaves two
 * cities, and a hex in it touching both: placing a tile there joins them into one.
 */
export function splitColumn(): { column: number; joining: HexKey } {
  if (split) return split
  for (let column = 1; column < BOARD.grid.columns - 1; column += 1) {
    const tiles: Record<HexKey, Tile> = { ...startingTiles }
    for (const hex of BOARD.hexes) if (hex.terrain === 'open' && hex.col !== column && !tiles[hex.key]) tiles[hex.key] = { kind: 'factory' }
    const { list, byHex } = citiesOnBoard(tiles)
    if (list.length !== 2) continue
    const joining = BOARD.hexes.find(
      hex =>
        hex.col === column &&
        hex.terrain === 'open' &&
        !tiles[hex.key] &&
        new Set(hex.neighbors.flatMap(neighbor => byHex.get(neighbor.key)?.[0] ?? [])).size === 2,
    )
    if (joining) {
      split = { column, joining: joining.key }
      return split
    }
  }
  throw new Error('No column of the map splits it into two cities that one tile can join.')
}

