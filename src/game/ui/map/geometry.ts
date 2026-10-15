import { hexAt } from '../../map/board'
import { GRID } from '../../map/mapData'
import { gridPixelSize, hexCenter, hexCorners, midpoint, sideCorners, type EdgeRef, type HexKey, type Point } from '../../map/hexGrid'
import { HOMES_PER_RESIDENCE } from '../../rules/types'
import { TILE_STYLE } from '../theme'

// Everything on the map is drawn at this hex size, in grid pixel space (origin at the
// grid's top-left); the SVG viewBox scales it to the screen.
export const HEX_RADIUS = 100

export const MAP_SIZE = gridPixelSize(GRID, HEX_RADIUS)

export const TILE_RADIUS = HEX_RADIUS * TILE_STYLE.sizeRatio

// Positions and sizes inside a tile, in px at map scale.
export const TILE_LAYOUT = {
  houseSize: 0.46 * TILE_RADIUS,
  printedHouseSize: 0.52 * TILE_RADIUS,
  houseY: -0.36 * TILE_RADIUS,
  slotSize: 0.29 * TILE_RADIUS,
  slotPitch: 0.36 * TILE_RADIUS,
  slotY: 0.2 * TILE_RADIUS,
  cubeSize: 0.32 * TILE_RADIUS,
  stationSize: 0.92 * TILE_RADIUS,
  factorySize: 0.72 * TILE_RADIUS,
  factoryY: -0.12 * TILE_RADIUS,
  jobY: 0.5 * TILE_RADIUS,
  jobRadius: 0.05 * TILE_RADIUS,
  jobPitch: 0.16 * TILE_RADIUS,
  schoolSize: 0.86 * TILE_RADIUS,
} as const

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

/** Centres of a Residence's homes, left to right; families fill them in order. */
export function homeCenters(tileCenter: Point): Point[] {
  return Array.from({ length: HOMES_PER_RESIDENCE }, (_, index) => ({
    x: tileCenter.x + (index - (HOMES_PER_RESIDENCE - 1) / 2) * TILE_LAYOUT.slotPitch,
    y: tileCenter.y + TILE_LAYOUT.slotY,
  }))
}
