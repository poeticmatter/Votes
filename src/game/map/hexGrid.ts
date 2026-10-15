// Flat-top hex grid in "odd-q" offset coordinates, ported from the asset generator:
// columns run left to right and odd columns sit half a hex lower. Side i of a hex
// runs from corner i to corner i + 1, with corner 0 pointing east and corners going
// clockwise (SVG's y axis points down).

export type HexSide = 'SE' | 'S' | 'SW' | 'NW' | 'N' | 'NE'

export const SIDES: readonly HexSide[] = ['SE', 'S', 'SW', 'NW', 'N', 'NE']

export type HexCoord = readonly [col: number, row: number]

/** A hex edge named from one of its hexes. */
export type EdgeRef = readonly [col: number, row: number, side: HexSide]

/** `"col,row"`: hexes are keyed by string so they can index JSON-serialisable state. */
export type HexKey = string

export interface Point {
  x: number
  y: number
}

const SQRT3 = Math.sqrt(3)

// [column offset, row offset] for even columns, then for odd columns.
const NEIGHBOR_OFFSETS: Record<HexSide, readonly [HexCoord, HexCoord]> = {
  N: [[0, -1], [0, -1]],
  S: [[0, 1], [0, 1]],
  NE: [[1, -1], [1, 0]],
  SE: [[1, 0], [1, 1]],
  NW: [[-1, -1], [-1, 0]],
  SW: [[-1, 0], [-1, 1]],
}

export const hexKey = (col: number, row: number): HexKey => `${col},${row}`

export function neighborOf(col: number, row: number, side: HexSide): HexCoord {
  const [colOffset, rowOffset] = NEIGHBOR_OFFSETS[side][col % 2]
  return [col + colOffset, row + rowOffset]
}

/** The same edge seen from either of its hexes gets the same key. */
export function edgeKey(col: number, row: number, side: HexSide): string {
  const [otherCol, otherRow] = neighborOf(col, row, side)
  const ends = [[col, row], [otherCol, otherRow]].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return ends.map(([c, r]) => hexKey(c, r)).join('|')
}

export const apothemOf = (radius: number): number => (radius * SQRT3) / 2

export function gridPixelSize(grid: { columns: number; rows: number }, radius: number) {
  return {
    width: radius * (2 + 1.5 * (grid.columns - 1)),
    height: apothemOf(radius) * (2 * grid.rows + 1),
  }
}

export function hexCenter(col: number, row: number, radius: number): Point {
  return {
    x: radius * (1 + 1.5 * col),
    y: apothemOf(radius) * (1 + 2 * row + (col % 2)),
  }
}

export function hexCorners(center: Point, radius: number): Point[] {
  return SIDES.map((_, index) => {
    const angle = (Math.PI / 3) * index
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
  })
}

export function sideCorners(corners: Point[], side: HexSide): [Point, Point] {
  const index = SIDES.indexOf(side)
  return [corners[index], corners[(index + 1) % corners.length]]
}

export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** Moves `point` toward `center` so it ends up `fraction` of the way there. */
export const towards = (point: Point, center: Point, fraction: number): Point => ({
  x: point.x + (center.x - point.x) * fraction,
  y: point.y + (center.y - point.y) * fraction,
})

const formatPoint = ({ x, y }: Point) => `${x.toFixed(2)} ${y.toFixed(2)}`

export function polygonPath(points: Point[]): string {
  return `${points.map((point, index) => `${index ? 'L' : 'M'}${formatPoint(point)}`).join(' ')} Z`
}

/**
 * A polygon with each corner replaced by a quadratic curve starting `cornerRadius` px
 * before the corner and ending the same distance after it.
 */
export function roundedPolygonPath(points: Point[], cornerRadius: number): string {
  if (!cornerRadius) return polygonPath(points)
  const count = points.length
  const body = points
    .map((corner, index) => {
      const previous = points[(index - 1 + count) % count]
      const next = points[(index + 1) % count]
      const entry = towards(corner, previous, cornerRadius / Math.hypot(previous.x - corner.x, previous.y - corner.y))
      const exit = towards(corner, next, cornerRadius / Math.hypot(next.x - corner.x, next.y - corner.y))
      return `${index ? 'L' : 'M'}${formatPoint(entry)} Q${formatPoint(corner)} ${formatPoint(exit)}`
    })
    .join(' ')
  return `${body} Z`
}
