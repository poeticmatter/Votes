import { hexCorners, roundedPolygonPath, type Point } from '../../map/hexGrid'
import type { DistrictId } from '../../map/mapData'
import { JOBS_PER_FACTORY, type CubeColor, type PlayerColor, type Tile } from '../../rules/types'
import { COLORS, FONT_FAMILY, TILE_STYLE } from '../theme'
import { usePieceColorOf } from '../viewer'
import { homeCenters, TILE_LAYOUT, TILE_RADIUS } from './geometry'
import { FactoryGlyph, HouseGlyph, LetteredHouseGlyph, PlaceGlyph, SchoolGlyph, StationGlyph } from './glyphs'

// Pieces on the map, ported from the asset generator's src/pieces/Tile.jsx and
// Tokens.jsx. Every piece is drawn around a centre point at map scale.

const offset = (center: Point, dx: number, dy: number): Point => ({ x: center.x + dx, y: center.y + dy })

interface Outline {
  color: string
  width: number
}

const TileBase = ({ center, fill, outline }: { center: Point; fill: string; outline?: Outline }) => (
  <path
    d={roundedPolygonPath(hexCorners(center, TILE_RADIUS), TILE_STYLE.cornerRadius)}
    fill={fill}
    stroke={outline?.color ?? 'none'}
    strokeWidth={outline?.width ?? 0}
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

/**
 * Empty homes are white with a dashed outline. No cube is white, so an empty home can't
 * be mistaken for a family of the tile's colour (or for grey on a printed Residence).
 */
const Homes = ({ center, emptySlotColor, families }: { center: Point; emptySlotColor: string; families: CubeColor[] }) => {
  const { slotSize } = TILE_LAYOUT
  const slots = homeCenters(center)
  return (
    <g>
      {slots.slice(families.length).map(slot => (
        <rect
          key={slot.x}
          x={slot.x - slotSize / 2}
          y={slot.y - slotSize / 2}
          width={slotSize}
          height={slotSize}
          rx={slotSize * 0.18}
          fill={COLORS.paper}
          stroke={emptySlotColor}
          strokeWidth={1.5}
          strokeDasharray={TILE_STYLE.emptySlotDash}
        />
      ))}
      {families.map((color, index) => (
        <Cube key={`${index}-${color}`} center={slots[index]} color={color} />
      ))}
    </g>
  )
}

const ResidenceTile = ({ center, owner, families }: { center: Point; owner: PlayerColor; families: CubeColor[] }) => {
  const color = usePieceColorOf()(owner)
  const { houseSize, houseY } = TILE_LAYOUT
  return (
    <g>
      <TileBase center={center} fill={color.fill} />
      <PlaceGlyph center={offset(center, 0, houseY)} size={houseSize}>
        <HouseGlyph size={houseSize} color={color.ink} />
      </PlaceGlyph>
      <Homes center={center} emptySlotColor={color.ink} families={families} />
    </g>
  )
}

/** Printed on the board, but laid out like a tile so players see it works the same way. */
const PrintedResidence = ({ center, district, families }: { center: Point; district: DistrictId; families: CubeColor[] }) => {
  const { printed } = TILE_STYLE
  const { printedHouseSize, houseY } = TILE_LAYOUT
  return (
    <g>
      <TileBase center={center} fill={printed.fill} />
      <PlaceGlyph center={offset(center, 0, houseY)} size={printedHouseSize}>
        <LetteredHouseGlyph
          size={printedHouseSize}
          color={printed.ink}
          letter={district}
          letterColor={printed.fill}
          fontFamily={FONT_FAMILY}
        />
      </PlaceGlyph>
      <Homes center={center} emptySlotColor={printed.emptySlot} families={families} />
    </g>
  )
}

const StationTile = ({ center, owner }: { center: Point; owner: PlayerColor }) => {
  const color = usePieceColorOf()(owner)
  const { stationSize } = TILE_LAYOUT
  return (
    <g>
      <TileBase center={center} fill={color.fill} />
      <PlaceGlyph center={center} size={stationSize}>
        <StationGlyph size={stationSize} color={color.ink} />
      </PlaceGlyph>
    </g>
  )
}

const FactoryTile = ({ center }: { center: Point }) => {
  const { fill, ink } = TILE_STYLE.factory
  const { factorySize, factoryY, jobY, jobRadius, jobPitch } = TILE_LAYOUT
  const jobs = Array.from({ length: JOBS_PER_FACTORY }, (_, index) =>
    offset(center, (index - (JOBS_PER_FACTORY - 1) / 2) * jobPitch, jobY),
  )
  return (
    <g>
      <TileBase center={center} fill={fill} />
      <PlaceGlyph center={offset(center, 0, factoryY)} size={factorySize}>
        <FactoryGlyph size={factorySize} color={ink} />
      </PlaceGlyph>
      {jobs.map(job => (
        <circle key={job.x} cx={job.x} cy={job.y} r={jobRadius} fill={ink} />
      ))}
    </g>
  )
}

const SchoolTile = ({ center }: { center: Point }) => {
  const { fill, ink, outline } = TILE_STYLE.school
  const { schoolSize } = TILE_LAYOUT
  return (
    <g>
      <TileBase center={center} fill={fill} outline={outline} />
      <PlaceGlyph center={center} size={schoolSize}>
        <SchoolGlyph size={schoolSize} color={ink} />
      </PlaceGlyph>
    </g>
  )
}

/** `district` names a printed Residence's letter; other tiles ignore it. */
export function TilePiece({ tile, center, district }: { tile: Tile; center: Point; district: DistrictId | null }) {
  switch (tile.kind) {
    case 'residence':
      if (tile.owner) return <ResidenceTile center={center} owner={tile.owner} families={tile.families} />
      if (!district) throw new Error('A printed Residence needs its district letter')
      return <PrintedResidence center={center} district={district} families={tile.families} />
    case 'station':
      return <StationTile center={center} owner={tile.owner} />
    case 'factory':
      return <FactoryTile center={center} />
    case 'school':
      return <SchoolTile center={center} />
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
