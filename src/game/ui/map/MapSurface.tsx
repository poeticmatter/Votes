import { memo, type ReactNode } from 'react'
import { BOARD, type BoardHex, type Terrain } from '../../map/board'
import { apothemOf, hexCenter, hexCorners, polygonPath, roundedPolygonPath, sideCorners, towards, type EdgeRef, type Point } from '../../map/hexGrid'
import { COLORS, MAP_STYLE } from '../theme'
import { edgeEndpoints, HEX_RADIUS } from './geometry'
import { ForestGlyph, MountainGlyph, PlaceGlyph, WavesGlyph } from './glyphs'
import { sleeperPositions, trackPath, type TrackPosition } from './trackGeometry'

// The printed map: cells, terrain, rail-side bands, river, track and bridges. Ported
// from the asset generator's src/map/layers.jsx. It never changes during a game, so
// everything is computed once and the component is memoised. Station sites depend on
// the player count, so they're drawn separately (StationSites.tsx).

const CELL_RADIUS = HEX_RADIUS * (1 - MAP_STYLE.cellInset)

const CELL_FILLS: Record<Terrain, string> = {
  open: COLORS.cell,
  mountain: COLORS.mountain,
  lake: COLORS.water,
  forest: COLORS.forest,
}

const centerOf = (hex: BoardHex) => hexCenter(hex.col, hex.row, HEX_RADIUS)

const HexCells = () => (
  <g>
    {BOARD.hexes.map(hex => (
      <path
        key={hex.key}
        d={roundedPolygonPath(hexCorners(centerOf(hex), CELL_RADIUS), MAP_STYLE.cellCornerRadius)}
        fill={CELL_FILLS[hex.terrain]}
      />
    ))}
  </g>
)

const TERRAIN_GLYPHS: Record<Exclude<Terrain, 'open'>, { size: number; glyph: (size: number) => ReactNode }> = {
  mountain: { size: MAP_STYLE.mountainGlyphSize, glyph: size => <MountainGlyph size={size} color={COLORS.paper} /> },
  lake: {
    size: MAP_STYLE.wavesGlyphSize,
    glyph: size => <WavesGlyph size={size} color={COLORS.paper} strokeWidth={MAP_STYLE.wavesStrokeWidth} />,
  },
  forest: { size: MAP_STYLE.forestGlyphSize, glyph: size => <ForestGlyph size={size} color={COLORS.paper} /> },
}

const TerrainArt = () => (
  <g>
    {BOARD.hexes.map(hex => {
      if (hex.terrain === 'open') return null
      const { size, glyph } = TERRAIN_GLYPHS[hex.terrain]
      return (
        <PlaceGlyph key={hex.key} center={centerOf(hex)} size={size}>
          {glyph(size)}
        </PlaceGlyph>
      )
    })}
  </g>
)

/**
 * A faint strip inside every hex side that borders a rail: it shows which Factories
 * score double, and it stays visible around a placed tile.
 */
const RailSideBands = () => {
  const depth = MAP_STYLE.railSideBandWidth / apothemOf(CELL_RADIUS)
  return (
    <g fill={COLORS.railSide}>
      {BOARD.hexes.flatMap(hex =>
        hex.railSides.map(side => {
          const center = centerOf(hex)
          const [start, end] = sideCorners(hexCorners(center, CELL_RADIUS), side)
          return (
            <path key={`${hex.key}-${side}`} d={polygonPath([start, end, towards(end, center, depth), towards(start, center, depth)])} />
          )
        }),
      )}
    </g>
  )
}

const POINT_TOLERANCE = 0.5
const isSamePoint = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < POINT_TOLERANCE

/** Chains an ordered list of edges into one polyline's points. */
function edgeChainPoints(edges: readonly EdgeRef[]): Point[] {
  const segments = edges.map(edgeEndpoints)
  const [firstStart, firstEnd] = segments[0]
  const startsReversed = segments.length > 1 && !segments[1].some(point => isSamePoint(point, firstEnd))
  const points = startsReversed ? [firstEnd, firstStart] : [firstStart, firstEnd]
  for (const [start, end] of segments.slice(1)) {
    const last = points[points.length - 1]
    if (isSamePoint(start, last)) points.push(end)
    else if (isSamePoint(end, last)) points.push(start)
    else throw new Error(`Edge path breaks after (${last.x.toFixed(1)}, ${last.y.toFixed(1)})`)
  }
  return points
}

const polylinePath = (points: Point[]) =>
  points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')

const River = () => (
  <path
    d={polylinePath(edgeChainPoints(BOARD.river))}
    fill="none"
    stroke={COLORS.water}
    strokeWidth={MAP_STYLE.riverWidth}
    strokeLinejoin="round"
    strokeLinecap="round"
  />
)

/** Rounds a bracket's two inner corners to match the rounded cells. */
function bracketPath([armStart, cornerStart, cornerEnd, armEnd]: Point[], cornerRadius: number): string {
  const round = (corner: Point, from: Point, to: Point) => {
    const entry = towards(corner, from, cornerRadius / Math.hypot(from.x - corner.x, from.y - corner.y))
    const exit = towards(corner, to, cornerRadius / Math.hypot(to.x - corner.x, to.y - corner.y))
    return `L${entry.x.toFixed(2)} ${entry.y.toFixed(2)} Q${corner.x.toFixed(2)} ${corner.y.toFixed(2)} ${exit.x.toFixed(2)} ${exit.y.toFixed(2)}`
  }
  return [
    `M${armStart.x.toFixed(2)} ${armStart.y.toFixed(2)}`,
    round(cornerStart, armStart, cornerEnd),
    round(cornerEnd, cornerStart, armEnd),
    `L${armEnd.x.toFixed(2)} ${armEnd.y.toFixed(2)}`,
  ].join(' ')
}

/** The )( map symbol where a rail crosses the river: a bracket each side, arms flaring away. */
const Bridges = () => {
  const { offset, lengthFraction, armLength, armAngleDegrees, cornerRadius, strokeWidth } = MAP_STYLE.bridge
  const armAngle = (armAngleDegrees * Math.PI) / 180
  const armOut = armLength * Math.sin(armAngle)
  const armBack = armLength * Math.cos(armAngle)
  return (
    <g fill="none" stroke={COLORS.ink} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
      {BOARD.bridges.flatMap(edge => {
        const [start, end] = edgeEndpoints(edge)
        const length = Math.hypot(end.x - start.x, end.y - start.y)
        const across = { x: -(end.y - start.y) / length, y: (end.x - start.x) / length }
        const lengthwise = { x: (end.x - start.x) / length, y: (end.y - start.y) / length }
        const from = towards(start, end, (1 - lengthFraction) / 2)
        const to = towards(start, end, (1 + lengthFraction) / 2)
        return [1, -1].map(sideSign => {
          // `out` moves away from the rail, `forward` along it.
          const shift = (point: Point, out: number, forward = 0) => ({
            x: point.x + across.x * sideSign * out + lengthwise.x * forward,
            y: point.y + across.y * sideSign * out + lengthwise.y * forward,
          })
          const points = [shift(from, offset + armOut, -armBack), shift(from, offset), shift(to, offset), shift(to, offset + armOut, armBack)]
          return <path key={`${edge.join(',')}-${sideSign}`} d={bracketPath(points, cornerRadius)} />
        })
      })}
    </g>
  )
}

const RAIL_POINTS = BOARD.railLines.map(edgeChainPoints)

// Closer than this, two sleepers would overlap.
const SLEEPER_CLEARANCE = 8

/**
 * Sleepers of both lines. Where the lines share track, and through the switch where
 * they curve apart, sleepers from the two lines land on each other; like the shared
 * timbers of a real switch, only one is kept.
 */
const SLEEPERS: TrackPosition[] = (() => {
  const { curveTangent, sleepersPerEdge } = MAP_STYLE.track
  const kept: TrackPosition[] = []
  for (const sleeper of RAIL_POINTS.flatMap(points => sleeperPositions(points, curveTangent, sleepersPerEdge))) {
    const isCrowded = kept.some(other => Math.hypot(other.point.x - sleeper.point.x, other.point.y - sleeper.point.y) < SLEEPER_CLEARANCE)
    if (!isCrowded) kept.push(sleeper)
  }
  return kept
})()

const Sleepers = () => {
  const { sleeperLength, sleeperWidth } = MAP_STYLE.track
  const half = sleeperLength / 2
  return (
    <g stroke={COLORS.ink} strokeWidth={sleeperWidth} strokeLinecap="butt">
      {SLEEPERS.map(({ point, normal }) => (
        <line
          key={`${point.x.toFixed(1)},${point.y.toFixed(1)}`}
          x1={point.x - normal.x * half}
          y1={point.y - normal.y * half}
          x2={point.x + normal.x * half}
          y2={point.y + normal.y * half}
        />
      ))}
    </g>
  )
}

const TrackStroke = ({ color, width }: { color: string; width: number }) => (
  <g fill="none" stroke={color} strokeWidth={width} strokeLinecap="round">
    {RAIL_POINTS.map(points => (
      <path key={`${points[0].x},${points[0].y}`} d={trackPath(points, MAP_STYLE.track.curveTangent)} />
    ))}
  </g>
)

/**
 * Two rails: a charcoal casing with the gauge knocked out in cell white, then sleepers
 * on top. Drawing every line's casing before any gauge makes switches join cleanly.
 */
const Track = () => {
  const { gauge, railWidth } = MAP_STYLE.track
  return (
    <g>
      <TrackStroke color={COLORS.ink} width={gauge + 2 * railWidth} />
      <TrackStroke color={COLORS.cell} width={gauge} />
      <Sleepers />
    </g>
  )
}

export const MapSurface = memo(function MapSurface() {
  return (
    <g>
      <HexCells />
      <TerrainArt />
      <RailSideBands />
      <River />
      <Track />
      <Bridges />
    </g>
  )
})
