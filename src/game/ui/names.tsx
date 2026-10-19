import { ColorSwatch } from 'game-kit/turns'
import { hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { cityAt } from '../rules/boardQueries'
import type { TownId } from '../map/mapData'
import type { CubeColor, PlayerColor, Tile, TileKind, VotesState } from '../rules/types'
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

/** "A", or "B + C" for a city of two towns. */
export function cityLabel(city: TownId[]): string {
  return city.join(' + ')
}

/** "Station of town B", "Starting Residence A", "Residence in city B + C", "School in city A". */
export function describeHex(state: VotesState, key: HexKey): string {
  const tile = state.tiles[key]
  const { stationSite, residenceSite } = hexAt(key)
  if (tile?.kind === 'station') return `Station of town ${stationSite}`
  if (tile?.kind === 'residence' && residenceSite) return `Starting Residence ${residenceSite}`
  return `${tile ? TILE_NAMES[tile.kind] : 'Hex'} in city ${cityLabel(cityAt(state, key))}`
}

/** "1 cube", "3 cubes"; "2 people" with an irregular `plural`. */
export function countOf(count: number, noun: string, plural = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : plural}`
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

/** "Blue", for a cube or person of that colour. */
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
      <TilePiece tile={tile} center={{ x: 0, y: 0 }} townLetter={null} />
    </svg>
  )
}
