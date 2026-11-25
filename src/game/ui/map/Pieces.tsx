import { hexCorners, roundedPolygonPath, type HexKey, type Point } from '../../map/hexGrid'
import type { TownId } from '../../map/mapData'
import type { CubeColor, PlaceableKind, PlayerColor, Tile } from '../../rules/types'
import { COLORS, FONT_FAMILY, TILE_STYLE } from '../theme'
import { usePieceColorOf } from '../viewer'
import { residentCenters, TILE_LAYOUT, TILE_RADIUS } from './geometry'
import { FactoryGlyph, HouseGlyph, LetteredHouseGlyph, PlaceGlyph, SchoolGlyph } from './glyphs'

// Pieces on the map, ported from the asset generator's src/pieces/Tile.jsx and
// Tokens.jsx. Every piece is drawn around a centre point at map scale. A tile a player
// placed wears its owner's colour as a thick outline; the starting Residences and printed
// Factories, owned by nobody, keep the plain one.

const OWNER_OUTLINE_WIDTH = 7

const TileBase = ({ center, fill, owner }: { center: Point; fill: string; owner: PlayerColor | null }) => {
  const pieceColorOf = usePieceColorOf()
  return (
    <path
      d={roundedPolygonPath(hexCorners(center, TILE_RADIUS), TILE_STYLE.cornerRadius)}
      fill={fill}
      stroke={owner ? pieceColorOf(owner).fill : TILE_STYLE.outline.color}
      strokeWidth={owner ? OWNER_OUTLINE_WIDTH : TILE_STYLE.outline.width}
    />
  )
}

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

const Cubes = ({ colors, center }: { colors: CubeColor[]; center: Point }) => {
  const positions = residentCenters(center, colors.length)
  return (
    <g>
      {colors.map((color, index) => (
        <Cube key={`${index}-${color}`} center={positions[index]} color={color} />
      ))}
    </g>
  )
}

const BUILDING_GLYPHS = {
  residence: { size: TILE_LAYOUT.residenceSize, Glyph: HouseGlyph },
  factory: { size: TILE_LAYOUT.factorySize, Glyph: FactoryGlyph },
  school: { size: TILE_LAYOUT.schoolSize, Glyph: SchoolGlyph },
} as const

interface TileLook {
  center: Point
  kind: PlaceableKind
  owner: PlayerColor | null
  /** People on a Residence, or cubes waiting on a Factory, in rows over the glyph. */
  cubes: CubeColor[]
  /** A town's starting Residence carries its letter in its house. */
  townLetter: TownId | null
}

function TileFace({ center, kind, owner, cubes, townLetter }: TileLook) {
  const { fill } = TILE_STYLE
  const { size, Glyph } = BUILDING_GLYPHS[kind]
  return (
    <g>
      <TileBase center={center} fill={fill} owner={owner} />
      <PlaceGlyph center={center} size={size}>
        {townLetter ? (
          <LetteredHouseGlyph size={size} color={TILE_STYLE.ink} letter={townLetter} letterColor={fill} fontFamily={FONT_FAMILY} />
        ) : (
          <Glyph size={size} color={TILE_STYLE.ink} />
        )}
      </PlaceGlyph>
      <Cubes colors={cubes} center={center} />
    </g>
  )
}

/** An empty tile of `kind`, owned by nobody: an icon, or a ghost on the rules sheet. */
export function KindPiece({ kind, center }: { kind: PlaceableKind; center: Point }) {
  return <TileFace center={center} kind={kind} owner={null} cubes={[]} townLetter={null} />
}

/** A placed tile. `townLetter` names a town's starting Residence; other tiles ignore it. */
export function TilePiece({ tile, center, townLetter }: { tile: Tile; center: Point; townLetter: TownId | null }) {
  switch (tile.kind) {
    case 'residence':
      return <TileFace center={center} kind="residence" owner={tile.owner} cubes={tile.people} townLetter={townLetter} />
    case 'factory':
      return <TileFace center={center} kind="factory" owner={tile.owner} cubes={tile.cubes} townLetter={null} />
    case 'school':
      return <TileFace center={center} kind="school" owner={tile.owner} cubes={[]} townLetter={null} />
  }
}

/** Every tile in `tiles`. */
export function PlacedTiles({
  tiles,
  centerOf,
  townLetterOf,
}: {
  tiles: [HexKey, Tile][]
  centerOf: (key: HexKey) => Point
  townLetterOf: (key: HexKey) => TownId | null
}) {
  return (
    <>
      {tiles.map(([key, tile]) => (
        <TilePiece key={key} tile={tile} center={centerOf(key)} townLetter={townLetterOf(key)} />
      ))}
    </>
  )
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
