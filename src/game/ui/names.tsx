import { createContext, useContext, type ReactNode } from 'react'
import { ColorSwatch, type PlayerProfile, type Seating, type UserRole } from 'game-kit/turns'
import { PLAYER_COLORS, type CubeColor, type PlayerColor, type Tile, type TileKind } from '../rules/types'
import { TILE_RADIUS } from './map/geometry'
import { TilePiece } from './map/Pieces'
import { PIECE_COLORS } from './pieceColors'

// How the board names players and pieces in text. Seat i plays PLAYER_COLORS[i].

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

interface Viewer {
  players: PlayerProfile[]
  role: UserRole
  seating: Seating
}

const ViewerContext = createContext<Viewer | null>(null)

export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
}

function useViewer(): Viewer {
  const viewer = useContext(ViewerContext)
  if (!viewer) throw new Error('useViewer must be used inside ViewerProvider')
  return viewer
}

export function seatOfColor(color: PlayerColor): number {
  return PLAYER_COLORS.indexOf(color)
}

/** "You" for the viewer's own colour in an online game, otherwise the player's name. */
export function useNameOf(): (color: CubeColor) => string {
  const { players, role, seating } = useViewer()
  return color => {
    if (color === 'grey') return 'Grey'
    const seat = seatOfColor(color)
    if (seating === 'remote' && role === seat) return 'You'
    return players[seat]?.name ?? PIECE_COLORS[color].name
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
  return (
    <span className="inline-flex items-center gap-1.5 align-middle font-semibold">
      <ColorSwatch color={PIECE_COLORS[color].fill} />
      {nameOf(color)}
    </span>
  )
}

export function CubeChip({ color, size = 14 }: { color: CubeColor; size?: number }) {
  return <ColorSwatch color={PIECE_COLORS[color].fill} size={size} />
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
