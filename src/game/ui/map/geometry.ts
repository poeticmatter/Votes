import { hexAt } from '../../map/board'
import { GRID } from '../../map/mapData'
import { gridPixelSize, hexCenter, hexCorners, midpoint, sideCorners, type EdgeRef, type HexKey, type Point } from '../../map/hexGrid'
import { RESIDENCE_CAPACITY } from '../../rules/types'
import { TILE_STYLE } from '../theme'

// Everything on the map is drawn at this hex size, in grid pixel space (origin at the
// grid's top-left); the SVG viewBox scales it to the screen.
export const HEX_RADIUS = 100

export const MAP_SIZE = gridPixelSize(GRID, HEX_RADIUS)

export const TILE_RADIUS = HEX_RADIUS * TILE_STYLE.sizeRatio

// Positions and sizes inside a tile, in px at map scale.
export const TILE_LAYOUT = {
  houseSize: 0.46 * TILE_RADIUS,
  startingHouseSize: 0.52 * TILE_RADIUS,
  houseY: -0.36 * TILE_RADIUS,
  slotSize: 0.29 * TILE_RADIUS,
  slotPitch: 0.36 * TILE_RADIUS,
  slotY: 0.2 * TILE_RADIUS,
  // People beyond a Residence's 3 homes (a School can overfill it) sit in a row under them.
  overflowY: 0.56 * TILE_RADIUS,
  // People waiting at a Station sit over the bottom of its glyph.
  waitingY: 0.42 * TILE_RADIUS,
  cubeSize: 0.32 * TILE_RADIUS,
  stationSize: 0.92 * TILE_RADIUS,
  factorySize: 0.84 * TILE_RADIUS,
  schoolSize: 0.86 * TILE_RADIUS,
} as const

const CUBES_PER_ROW = 3

export function centerOfHex(key: HexKey): Point {
  const { col, row } = hexAt(key)
  return hexCenter(col, row, HEX_RADIUS)
}

export function edgeEndpoints([col, row, side]: EdgeRef): [Point, Point] {
  return sideCorners(hexCorners(hexCenter(col, row, HEX_RADIUS), HEX_RADIUS), side)
}

/** The middle of the edge two neighbouring hexes share, where a merger marker sits. */
export function sharedEdgeMidpoint([from, to]: [HexKey, HexKey]): Point {
  const neighbor = hexAt(from).neighbors.find(entry => entry.key === to)
  if (!neighbor) throw new Error(`Hexes ${from} and ${to} aren't neighbours`)
  const { col, row } = hexAt(from)
  return midpoint(...edgeEndpoints([col, row, neighbor.side]))
}

interface CubeRows {
  firstRowY: number
  /** How far below the previous row each row sits; negative stacks rows upwards. */
  rowStep: number
  count: number
}

/** `count` cube centres in rows of up to 3, each row centred. Ported from the asset generator. */
function cubeRows(tileCenter: Point, { firstRowY, rowStep, count }: CubeRows): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / CUBES_PER_ROW)
    const inRow = Math.min(CUBES_PER_ROW, count - row * CUBES_PER_ROW)
    return {
      x: tileCenter.x + ((index % CUBES_PER_ROW) - (inRow - 1) / 2) * TILE_LAYOUT.slotPitch,
      y: tileCenter.y + firstRowY + row * rowStep,
    }
  })
}

/** Centres of a Residence's homes, left to right; people fill them in order. */
export function homeCenters(tileCenter: Point): Point[] {
  return cubeRows(tileCenter, { firstRowY: TILE_LAYOUT.slotY, rowStep: 0, count: RESIDENCE_CAPACITY })
}

/** Where `count` people on a Residence sit: its homes, then any overflow. */
export function residentCenters(tileCenter: Point, count: number): Point[] {
  const overflow = cubeRows(tileCenter, {
    firstRowY: TILE_LAYOUT.overflowY,
    rowStep: TILE_LAYOUT.slotPitch,
    count: Math.max(0, count - RESIDENCE_CAPACITY),
  })
  return [...homeCenters(tileCenter), ...overflow].slice(0, count)
}

/** Where `count` people waiting at a Station sit. */
export function waitingCenters(tileCenter: Point, count: number): Point[] {
  return cubeRows(tileCenter, { firstRowY: TILE_LAYOUT.waitingY, rowStep: -TILE_LAYOUT.slotPitch, count })
}
