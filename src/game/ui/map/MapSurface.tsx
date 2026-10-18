import { memo } from 'react'
import { BOARD, type BoardHex, type Terrain } from '../../map/board'
import { apothemOf, hexCenter, hexCorners, polygonPath, roundedPolygonPath, sideCorners, towards, type EdgeRef, type Point } from '../../map/hexGrid'
import { COLORS, MAP_STYLE } from '../theme'
import { edgeEndpoints, HEX_RADIUS } from './geometry'
import { MountainGlyph, PlaceGlyph } from './glyphs'
import { sleeperPositions, trackPath, type TrackPosition } from './trackGeometry'

// The printed map: cells, mountains, rail-side bands and the track. Ported from the
// asset generator's src/map/layers.jsx. It never changes during a game, so everything
// is computed once and the component is memoised.

const CELL_RADIUS = HEX_RADIUS * (1 - MAP_STYLE.cellInset)

const CELL_FILLS: Record<Terrain, string> = {
  open: COLORS.cell,
  mountain: COLORS.mountain,
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

const Mountains = () => (
  <g>
    {BOARD.hexes
      .filter(hex => hex.terrain === 'mountain')
      .map(hex => (
        <PlaceGlyph key={hex.key} center={centerOf(hex)} size={MAP_STYLE.mountainGlyphSize}>
          <MountainGlyph size={MAP_STYLE.mountainGlyphSize} color={COLORS.paper} />
        </PlaceGlyph>
      ))}
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

const RAIL_POINTS = edgeChainPoints(BOARD.rail)

const SLEEPERS: TrackPosition[] = sleeperPositions(RAIL_POINTS, MAP_STYLE.track.curveTangent, MAP_STYLE.track.sleepersPerEdge)

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
  <path d={trackPath(RAIL_POINTS, MAP_STYLE.track.curveTangent)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
)

/** Two rails: a charcoal casing with the gauge knocked out in cell white, then sleepers on top. */
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
      <Mountains />
      <RailSideBands />
      <Track />
    </g>
  )
})
