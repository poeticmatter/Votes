import type { ReactNode } from 'react'
import { BOARD, hexAt } from '../../map/board'
import { apothemOf, hexCenter, type HexKey, type Point } from '../../map/hexGrid'
import { peopleAt } from '../../rules/boardQueries'
import { newTile } from '../../rules/placement'
import { centerOfHex, HEX_RADIUS, residentCenters } from '../map/geometry'
import { MapSurface } from '../map/MapSurface'
import { TilePiece } from '../map/Pieces'
import { COLORS } from '../theme'
import { CubeRing, CubeTag, GhostTile, GutterArrow, JustPlacedOutline, NumberBadge } from './annotations'
import {
  IMMIGRATION_EXAMPLE,
  LEVELLING_EXAMPLE,
  MERGER_EXAMPLE,
  PLACEMENT_EXAMPLE,
  SCHOOL_EXAMPLE,
  stateOf,
  type BagTag,
  type ExamplePosition,
  type PersonArrow,
  type TagSide,
} from './examples'

// The rules sheet's map examples, drawn from examples.ts with the game's own map and
// pieces. Ported from the asset generator's src/rules/ExampleFigures.jsx and MapExcerpt.jsx.

const EXCERPT_PADDING = 6

/** The pixel box that fully shows every hex in the example's columns and rows. */
function excerptBox({ columns: [firstColumn, lastColumn], rows: [firstRow, lastRow] }: ExamplePosition) {
  const apothem = apothemOf(HEX_RADIUS)
  const centers = BOARD.hexes
    .filter(hex => hex.col >= firstColumn && hex.col <= lastColumn && hex.row >= firstRow && hex.row <= lastRow)
    .map(hex => hexCenter(hex.col, hex.row, HEX_RADIUS))
  const left = Math.min(...centers.map(point => point.x)) - HEX_RADIUS - EXCERPT_PADDING
  const right = Math.max(...centers.map(point => point.x)) + HEX_RADIUS + EXCERPT_PADDING
  const top = Math.min(...centers.map(point => point.y)) - apothem - EXCERPT_PADDING
  const bottom = Math.max(...centers.map(point => point.y)) + apothem + EXCERPT_PADDING
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** A window onto the real map with the example's tiles on it; `children` draw on top, in map pixels. */
function MapExcerpt({ position, label, children }: { position: ExamplePosition; label: string; children: ReactNode }) {
  const box = excerptBox(position)
  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      className="block h-auto w-full overflow-hidden rounded-[10px]"
      role="img"
      aria-label={label}
    >
      <rect x={box.x} y={box.y} width={box.width} height={box.height} fill={COLORS.ground} />
      <MapSurface />
      {Object.entries(position.tiles).map(([key, tile]) => (
        <TilePiece key={key} tile={tile} center={centerOfHex(key)} townLetter={hexAt(key).residenceSite} />
      ))}
      {children}
    </svg>
  )
}

const shift = (point: Point, dx: number, dy: number): Point => ({ x: point.x + dx, y: point.y + dy })

/** Where a person sits on the Residence at `at`, by their place in its people. */
const residentCenter = (position: ExamplePosition, at: HexKey, home: number) =>
  residentCenters(centerOfHex(at), peopleAt(stateOf(position), at).length)[home]

// Badges sit on a candidate tile's top-right corner.
const BADGE_OFFSET = { x: 54, y: -50 }

export const PlacementFigure = () => (
  <MapExcerpt position={PLACEMENT_EXAMPLE.position} label="Five hexes around town B, numbered as in the text">
    {PLACEMENT_EXAMPLE.candidates.map(candidate => (
      <GhostTile key={candidate.number} tile={newTile(candidate.kind)} center={centerOfHex(candidate.at)} />
    ))}
    {PLACEMENT_EXAMPLE.candidates.map(candidate => (
      <NumberBadge
        key={candidate.number}
        center={shift(centerOfHex(candidate.at), BADGE_OFFSET.x, BADGE_OFFSET.y)}
        number={candidate.number}
        isAllowed={candidate.isAllowed}
      />
    ))}
  </MapExcerpt>
)

// Cube tags sit just above or below a tile, in the gutter between hexes.
const TAG_GAP: Record<TagSide, number> = { above: -92, below: 92 }

const BagTags = ({ tags }: { tags: BagTag[] }) => (
  <>
    {tags.map(({ at, color, amount, side }) => (
      <CubeTag key={at} center={shift(centerOfHex(at), 0, TAG_GAP[side])} color={color} amount={amount} />
    ))}
  </>
)

export const ImmigrationFigure = () => {
  const { position, placed, arrivals, bagTags } = IMMIGRATION_EXAMPLE
  return (
    <MapExcerpt position={position} label="Town A after a Factory brings 3 people into its Residences">
      <JustPlacedOutline center={centerOfHex(placed)} />
      {arrivals.map(({ at, home }) => (
        <CubeRing key={`${at}-${home}`} center={residentCenter(position, at, home)} />
      ))}
      <BagTags tags={bagTags} />
    </MapExcerpt>
  )
}

const Moves = ({ position, moves }: { position: ExamplePosition; moves: PersonArrow[] }) => (
  <>
    {moves.map(({ from, to, home }) => (
      <g key={`${from}-${to}-${home}`}>
        <GutterArrow from={centerOfHex(from)} to={centerOfHex(to)} />
        <CubeRing center={residentCenter(position, to, home)} />
      </g>
    ))}
  </>
)

export const LevellingFigure = () => (
  <MapExcerpt position={LEVELLING_EXAMPLE.position} label="Town A after levelling into a new Residence">
    <JustPlacedOutline center={centerOfHex(LEVELLING_EXAMPLE.placed)} />
    <Moves position={LEVELLING_EXAMPLE.position} moves={LEVELLING_EXAMPLE.moves} />
    <BagTags tags={LEVELLING_EXAMPLE.bagTags} />
  </MapExcerpt>
)

export const SchoolFigure = () => (
  <MapExcerpt position={SCHOOL_EXAMPLE.position} label="Town C after its School pulls people from B">
    <JustPlacedOutline center={centerOfHex(SCHOOL_EXAMPLE.placed)} />
    <Moves position={SCHOOL_EXAMPLE.position} moves={SCHOOL_EXAMPLE.moves} />
    <BagTags tags={SCHOOL_EXAMPLE.bagTags} />
  </MapExcerpt>
)

export const MergerFigure = () => (
  <MapExcerpt position={MERGER_EXAMPLE.position} label="A new Residence joining B and C, and the people who level into it">
    <JustPlacedOutline center={centerOfHex(MERGER_EXAMPLE.placed)} />
    <Moves position={MERGER_EXAMPLE.position} moves={MERGER_EXAMPLE.moves} />
  </MapExcerpt>
)
