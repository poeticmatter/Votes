import { hexCorners, roundedPolygonPath, type Point } from '../../map/hexGrid'
import type { TownId } from '../../map/mapData'
import type { CubeColor, Tile } from '../../rules/types'
import { COLORS, FONT_FAMILY, TILE_STYLE } from '../theme'
import { usePieceColorOf } from '../viewer'
import { residentCenters, TILE_LAYOUT, TILE_RADIUS } from './geometry'
import { FactoryGlyph, HouseGlyph, LetteredHouseGlyph, PlaceGlyph, SchoolGlyph, UniversityGlyph } from './glyphs'

// Pieces on the map, ported from the asset generator's src/pieces/Tile.jsx and
// Tokens.jsx. Every piece is drawn around a centre point at map scale.

const TileBase = ({ center, fill }: { center: Point; fill: string }) => (
  <path
    d={roundedPolygonPath(hexCorners(center, TILE_RADIUS), TILE_STYLE.cornerRadius)}
    fill={fill}
    stroke={TILE_STYLE.outline.color}
    strokeWidth={TILE_STYLE.outline.width}
  />
)

export const Cube = ({ center, color, size = TILE_LAYOUT.cubeSize }: { center: Point; color: CubeColor; size?: number }) => {
  const pieceColorOf = usePieceColorOf()
  return (
    <rect
      x={center.x - size / 2}
      y={center.y - size / 2}
      width={size}
      height={size}
      rx={size * 0.18}
      fill={pieceColorOf(color).fill}
      stroke="rgba(0, 0, 0, 0.45)"
      strokeWidth={1.5}
    />
  )
}

const Cubes = ({ colors, positions }: { colors: CubeColor[]; positions: Point[] }) => (
  <g>
    {colors.map((color, index) => (
      <Cube key={`${index}-${color}`} center={positions[index]} color={color} />
    ))}
  </g>
)

/**
 * `townLetter` marks a town's starting Residence, which carries the letter in its house.
 * Only the people show, sitting in a row over the house; there are no empty home slots.
 */
const ResidenceTile = ({ center, fill, people, townLetter }: { center: Point; fill: string; people: CubeColor[]; townLetter: TownId | null }) => {
  const size = TILE_LAYOUT.residenceSize
  return (
    <g>
      <TileBase center={center} fill={fill} />
      <PlaceGlyph center={center} size={size}>
        {townLetter ? (
          <LetteredHouseGlyph size={size} color={TILE_STYLE.ink} letter={townLetter} letterColor={fill} fontFamily={FONT_FAMILY} />
        ) : (
          <HouseGlyph size={size} color={TILE_STYLE.ink} />
        )}
      </PlaceGlyph>
      <Cubes colors={people} positions={residentCenters(center, people.length)} />
    </g>
  )
}

const BUILDING_GLYPHS = {
  factory: { size: TILE_LAYOUT.factorySize, Glyph: FactoryGlyph },
  school: { size: TILE_LAYOUT.schoolSize, Glyph: SchoolGlyph },
  university: { size: TILE_LAYOUT.universitySize, Glyph: UniversityGlyph },
} as const

const BuildingTile = ({ center, fill, kind }: { center: Point; fill: string; kind: keyof typeof BUILDING_GLYPHS }) => {
  const { size, Glyph } = BUILDING_GLYPHS[kind]
  return (
    <g>
      <TileBase center={center} fill={fill} />
      <PlaceGlyph center={center} size={size}>
        <Glyph size={size} color={TILE_STYLE.ink} />
      </PlaceGlyph>
    </g>
  )
}

const FACE_DOWN_GLYPH_SCALE = 0.7

/** A face-down Residence or Factory: a promise, pale and dashed, its kind shown faintly. */
const FaceDownTile = ({ center, kind }: { center: Point; kind: 'residence' | 'factory' }) => {
  const { faceDown, cornerRadius, outline } = TILE_STYLE
  const size = (kind === 'residence' ? TILE_LAYOUT.residenceSize : TILE_LAYOUT.factorySize) * FACE_DOWN_GLYPH_SCALE
  const Glyph = kind === 'residence' ? HouseGlyph : FactoryGlyph
  return (
    <g>
      <path
        d={roundedPolygonPath(hexCorners(center, TILE_RADIUS), cornerRadius)}
        fill={faceDown.fill}
        stroke={COLORS.ink}
        strokeWidth={outline.width}
        strokeDasharray={faceDown.dash}
      />
      <PlaceGlyph center={center} size={size}>
        <Glyph size={size} color={faceDown.ink} />
      </PlaceGlyph>
    </g>
  )
}

/** `townLetter` names a town's starting Residence; other tiles ignore it. */
export function TilePiece({ tile, center, townLetter }: { tile: Tile; center: Point; townLetter: TownId | null }) {
  const { fill } = TILE_STYLE
  switch (tile.kind) {
    case 'residence':
      if (tile.isFaceDown) return <FaceDownTile center={center} kind="residence" />
      return <ResidenceTile center={center} fill={fill} people={tile.people} townLetter={townLetter} />
    case 'factory':
      if (tile.isFaceDown) return <FaceDownTile center={center} kind="factory" />
      return <BuildingTile center={center} fill={fill} kind="factory" />
    case 'school':
      return <BuildingTile center={center} fill={fill} kind={tile.isUniversity ? 'university' : 'school'} />
  }
}

// Merger markers borrow the transit-map interchange symbol: a white disc in a heavy
// ring, where two lines (here, two cities) connect. Larger than the printed token
// (radius 22), which reads too small on a screen-sized map.
const MERGER_MARKER_RADIUS = 30
const MERGER_RING_WIDTH = 7
const MERGER_NUMBER_SIZE = 28

export const MergerMarker = ({ center, number }: { center: Point; number: number }) => (
  <g>
    <circle
      cx={center.x}
      cy={center.y}
      r={MERGER_MARKER_RADIUS - MERGER_RING_WIDTH / 2}
      fill={COLORS.paper}
      stroke={COLORS.ink}
      strokeWidth={MERGER_RING_WIDTH}
    />
    <text
      x={center.x}
      y={center.y}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={FONT_FAMILY}
      fontSize={MERGER_NUMBER_SIZE}
      fontWeight={800}
      fill={COLORS.ink}
    >
      {number}
    </text>
  </g>
)
