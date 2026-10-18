import { hexCorners, roundedPolygonPath, type Point } from '../../map/hexGrid'
import type { CubeColor, Tile } from '../../rules/types'
import { TILE_LAYOUT, TILE_RADIUS } from '../map/geometry'
import { Cube, TilePiece } from '../map/Pieces'
import { COLORS, FONT_FAMILY } from '../theme'

// Marks drawn over the rules sheet's map excerpts, in map pixels; ported from the asset
// generator's src/rules/annotations.jsx. Excerpts render at about half size, so these
// are drawn large enough to survive that.

const BADGE_RADIUS = 30
const MARK_STROKE = 6

/** Numbered to match a caption. Hollow means "allowed", solid "not allowed". */
export const NumberBadge = ({ center, number, isAllowed }: { center: Point; number: number; isAllowed: boolean }) => (
  <g>
    <circle
      cx={center.x}
      cy={center.y}
      r={BADGE_RADIUS}
      fill={isAllowed ? COLORS.paper : COLORS.ink}
      stroke={COLORS.ink}
      strokeWidth={MARK_STROKE}
    />
    <text
      x={center.x}
      y={center.y}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={FONT_FAMILY}
      fontSize={36}
      fontWeight={800}
      fill={isAllowed ? COLORS.ink : COLORS.paper}
    >
      {number}
    </text>
  </g>
)

/** A tile someone is considering: see-through, so it reads as hypothetical. */
export const GhostTile = ({ tile, center }: { tile: Tile; center: Point }) => (
  <g opacity={0.42}>
    <TilePiece tile={tile} center={center} townLetter={null} />
  </g>
)

/** Dashed outline around the tile that was just placed. */
export const JustPlacedOutline = ({ center }: { center: Point }) => (
  <path
    d={roundedPolygonPath(hexCorners(center, TILE_RADIUS + 9), 14)}
    fill="none"
    stroke={COLORS.ink}
    strokeWidth={MARK_STROKE}
    strokeDasharray="14 10"
  />
)

export const CubeRing = ({ center }: { center: Point }) => (
  <circle cx={center.x} cy={center.y} r={TILE_LAYOUT.cubeSize * 0.95} fill="none" stroke={COLORS.ink} strokeWidth={MARK_STROKE} />
)

const unit = (from: Point, to: Point): Point => {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
}

/** A straight arrow whose head ends exactly at `to`. */
function Arrow({ from, to, headSize }: { from: Point; to: Point; headSize: number }) {
  const tangent = unit(from, to)
  const shaftEnd = { x: to.x - tangent.x * headSize * 0.8, y: to.y - tangent.y * headSize * 0.8 }
  const base = { x: to.x - tangent.x * headSize, y: to.y - tangent.y * headSize }
  const wing = { x: -tangent.y * headSize * 0.55, y: tangent.x * headSize * 0.55 }
  return (
    <g>
      <path
        d={`M${from.x} ${from.y} L${shaftEnd.x} ${shaftEnd.y}`}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth={MARK_STROKE + 2}
        strokeLinecap="round"
      />
      <polygon points={`${to.x},${to.y} ${base.x + wing.x},${base.y + wing.y} ${base.x - wing.x},${base.y - wing.y}`} fill={COLORS.ink} />
    </g>
  )
}

// Between neighbouring tiles the arrow starts over the source tile's rim, clear of its
// glyph and cubes, and its tip stops on the destination tile's edge.
const GUTTER_ARROW = { startInset: 58, tipInset: (Math.sqrt(3) / 2) * TILE_RADIUS - 1, headSize: 30 }

/** Someone moving from one tile to a neighbouring one, across the gutter. */
export const GutterArrow = ({ from, to }: { from: Point; to: Point }) => {
  const direction = unit(from, to)
  const along = (point: Point, distance: number) => ({ x: point.x + direction.x * distance, y: point.y + direction.y * distance })
  return <Arrow from={along(from, GUTTER_ARROW.startInset)} to={along(to, -GUTTER_ARROW.tipInset)} headSize={GUTTER_ARROW.headSize} />
}

const TAG = { width: 104, height: 52, cube: 28 }

/** "+n cubes of this colour to the bag". */
export const CubeTag = ({ center, color, amount }: { center: Point; color: CubeColor; amount: number }) => (
  <g>
    <rect
      x={center.x - TAG.width / 2}
      y={center.y - TAG.height / 2}
      width={TAG.width}
      height={TAG.height}
      rx={TAG.height / 2}
      fill={COLORS.paper}
      stroke={COLORS.ink}
      strokeWidth={MARK_STROKE - 2}
    />
    <text
      x={center.x - 12}
      y={center.y}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={FONT_FAMILY}
      fontSize={32}
      fontWeight={800}
      fill={COLORS.ink}
    >
      +{amount}
    </text>
    <Cube center={{ x: center.x + 26, y: center.y }} color={color} size={TAG.cube} />
  </g>
)
