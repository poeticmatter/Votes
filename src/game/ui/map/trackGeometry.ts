import type { Point } from '../../map/hexGrid'

// Rail lines as real track, ported from the asset generator: straight runs joined by
// circular curves instead of sharp corners. Where the two lines share an edge, each
// curves off it on its own, which draws a switch: the outer rails sweep apart and the
// inner rails meet in a V.

interface LinePiece {
  kind: 'line'
  from: Point
  to: Point
  length: number
}

interface ArcPiece {
  kind: 'arc'
  from: Point
  to: Point
  center: Point
  radius: number
  /** +1 turns clockwise on screen (SVG's y points down). */
  sign: 1 | -1
  startAngle: number
  length: number
}

type TrackPiece = LinePiece | ArcPiece

export interface TrackPosition {
  point: Point
  /** Unit vector across the track. */
  normal: Point
}

const MIN_TURN_RADIANS = 1e-3

const unit = (from: Point, to: Point): Point => {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
}
const along = (point: Point, direction: Point, distance: number): Point => ({
  x: point.x + direction.x * distance,
  y: point.y + direction.y * distance,
})
const format = ({ x, y }: Point) => `${x.toFixed(2)} ${y.toFixed(2)}`
const distanceBetween = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

/** Splits a polyline into straight and curved pieces; each curve starts `tangent` px before its corner. */
function trackPieces(points: Point[], tangent: number): TrackPiece[] {
  const pieces: TrackPiece[] = []
  let cursor = points[0]
  for (let index = 1; index < points.length - 1; index += 1) {
    const corner = points[index]
    const incoming = unit(points[index - 1], corner)
    const outgoing = unit(corner, points[index + 1])
    const turn = Math.acos(Math.min(1, Math.max(-1, incoming.x * outgoing.x + incoming.y * outgoing.y)))
    if (turn < MIN_TURN_RADIANS) continue
    const sign = incoming.x * outgoing.y - incoming.y * outgoing.x > 0 ? 1 : -1
    const radius = tangent / Math.tan(turn / 2)
    const entry = along(corner, incoming, -tangent)
    const exit = along(corner, outgoing, tangent)
    const center = along(entry, { x: -incoming.y * sign, y: incoming.x * sign }, radius)
    pieces.push({ kind: 'line', from: cursor, to: entry, length: distanceBetween(cursor, entry) })
    pieces.push({
      kind: 'arc',
      from: entry,
      to: exit,
      center,
      radius,
      sign,
      startAngle: Math.atan2(entry.y - center.y, entry.x - center.x),
      length: radius * turn,
    })
    cursor = exit
  }
  const last = points[points.length - 1]
  pieces.push({ kind: 'line', from: cursor, to: last, length: distanceBetween(cursor, last) })
  return pieces
}

export function trackPath(points: Point[], tangent: number): string {
  const segments = trackPieces(points, tangent).map(piece =>
    piece.kind === 'line'
      ? `L${format(piece.to)}`
      : `A${piece.radius.toFixed(2)} ${piece.radius.toFixed(2)} 0 0 ${piece.sign > 0 ? 1 : 0} ${format(piece.to)}`,
  )
  return [`M${format(points[0])}`, ...segments].join(' ')
}

function positionInPiece(piece: TrackPiece, distance: number): TrackPosition {
  if (piece.kind === 'line') {
    const direction = unit(piece.from, piece.to)
    return { point: along(piece.from, direction, distance), normal: { x: -direction.y, y: direction.x } }
  }
  const angle = piece.startAngle + (piece.sign * distance) / piece.radius
  const radial = { x: Math.cos(angle), y: Math.sin(angle) }
  return { point: along(piece.center, radial, piece.radius), normal: radial }
}

function positionAlong(pieces: TrackPiece[], distance: number): TrackPosition {
  let remaining = distance
  for (const piece of pieces) {
    if (remaining <= piece.length) return positionInPiece(piece, remaining)
    remaining -= piece.length
  }
  const lastPiece = pieces[pieces.length - 1]
  return positionInPiece(lastPiece, lastPiece.length)
}

/**
 * Sleeper positions: `perEdge` per hex edge, evenly spread over the stretch of track
 * that edge owns (from the middle of one curve to the middle of the next), so spacing
 * is the same on straights and round curves.
 */
export function sleeperPositions(points: Point[], tangent: number, perEdge: number): TrackPosition[] {
  const pieces = trackPieces(points, tangent)
  const boundaries = [0]
  let travelled = 0
  for (const piece of pieces) {
    if (piece.kind === 'arc') boundaries.push(travelled + piece.length / 2)
    travelled += piece.length
  }
  boundaries.push(travelled)
  const positions: TrackPosition[] = []
  for (let edge = 0; edge < boundaries.length - 1; edge += 1) {
    const span = boundaries[edge + 1] - boundaries[edge]
    for (let index = 0; index < perEdge; index += 1) {
      positions.push(positionAlong(pieces, boundaries[edge] + ((index + 0.5) * span) / perEdge))
    }
  }
  return positions
}
