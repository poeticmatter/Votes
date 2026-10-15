import { ColorSwatch } from 'game-kit/turns'
import type { CubeColor, PlayerColor, Tile, TileKind } from '../rules/types'
import { TILE_RADIUS } from './map/geometry'
import { TilePiece } from './map/Pieces'
import { seatOfColor, usePieceColorOf, useViewer } from './viewer'

// How the board names players and pieces in text, always by the colour the viewer sees.

export const TILE_NAMES: Record<TileKind, string> = {
  residence: 'Residence',
  station: 'Station',
  factory: 'Factory',
  school: 'School',
}

/** "1 cube", "3 cubes". Every noun the board counts takes a plain -s plural. */
export function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

/** "You" for the viewer's own colour in an online game, otherwise the player's name. */
export function useNameOf(): (color: CubeColor) => string {
  const { players, role, seating } = useViewer()
  const pieceColorOf = usePieceColorOf()
  return color => {
    if (color === 'grey') return 'Grey'
    const seat = seatOfColor(color)
    if (seating === 'remote' && role === seat) return 'You'
    return players[seat]?.name ?? pieceColorOf(color).name
  }
}

/** "Your" for the viewer's own colour in an online game, otherwise "Ana’s". */
export function useOwnerOf(): (color: PlayerColor) => string {
  const nameOf = useNameOf()
  const isViewer = useIsViewer()
  return color => (isViewer(color) ? 'Your' : `${nameOf(color)}’s`)
}

export function useIsViewer(): (color: PlayerColor) => boolean {
  const { role, seating } = useViewer()
  return color => seating === 'remote' && role === seatOfColor(color)
}

export function PlayerChip({ color }: { color: CubeColor }) {
  const nameOf = useNameOf()
  const pieceColorOf = usePieceColorOf()
  return (
    <span className="inline-flex items-center gap-1.5 align-middle font-semibold">
      <ColorSwatch color={pieceColorOf(color).fill} />
      {nameOf(color)}
    </span>
  )
}

export function CubeChip({ color, size = 14 }: { color: CubeColor; size?: number }) {
  const pieceColorOf = usePieceColorOf()
  return <ColorSwatch color={pieceColorOf(color).fill} size={size} />
}

/** "Blue", for a cube or family of that colour. */
export function useColorNameOf(): (color: CubeColor) => string {
  const pieceColorOf = usePieceColorOf()
  return color => pieceColorOf(color).name
}

const ICON_MARGIN = 4
const ICON_HALF_WIDTH = TILE_RADIUS + ICON_MARGIN
const ICON_HALF_HEIGHT = (Math.sqrt(3) / 2) * TILE_RADIUS + ICON_MARGIN

/** A single tile as an inline SVG, `width` px wide. */
export function TileIcon({ tile, width }: { tile: Tile; width: number }) {
  return (
    <svg
      width={width}
      height={(width * ICON_HALF_HEIGHT) / ICON_HALF_WIDTH}
      viewBox={`${-ICON_HALF_WIDTH} ${-ICON_HALF_HEIGHT} ${2 * ICON_HALF_WIDTH} ${2 * ICON_HALF_HEIGHT}`}
      className="block shrink-0"
      aria-hidden
    >
      <TilePiece tile={tile} center={{ x: 0, y: 0 }} district={null} />
    </svg>
  )
}
