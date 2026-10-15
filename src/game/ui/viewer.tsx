import { createContext, useContext, type ReactNode } from 'react'
import type { PlayerIndex, PlayerProfile, Seating, UserRole } from 'game-kit/turns'
import { INDEPENDENT, PLAYER_COLORS, type CubeColor, type PlayerColor } from '../rules/types'
import { PIECE_COLORS, type PieceColor } from './pieceColors'

// Who is looking at the board, and the colours they see. Seat i plays PLAYER_COLORS[i],
// but in a hot-seat playtest GameKit disguises the seats (BoardProps.lookOf): the seat
// being played wears seat 0's colour and the others' colours are shuffled. So the board
// draws, names and orders every player colour through its look, never the colour itself.

export interface Viewer {
  players: PlayerProfile[]
  role: UserRole
  seating: Seating
  lookOf: (seat: PlayerIndex) => PlayerIndex
}

const ViewerContext = createContext<Viewer | null>(null)

export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
}

export function useViewer(): Viewer {
  const viewer = useContext(ViewerContext)
  if (!viewer) throw new Error('useViewer must be used inside ViewerProvider')
  return viewer
}

export function seatOfColor(color: PlayerColor): number {
  return PLAYER_COLORS.indexOf(color)
}

/** The colour `color`'s pieces are drawn in. Grey belongs to no seat, so it is never disguised. */
export function useLookOf(): (color: CubeColor) => CubeColor {
  const { lookOf } = useViewer()
  return color => (color === INDEPENDENT ? color : PLAYER_COLORS[lookOf(seatOfColor(color))])
}

export function usePieceColorOf(): (color: CubeColor) => PieceColor {
  const lookOf = useLookOf()
  return color => PIECE_COLORS[lookOf(color)]
}

const GREY_RANK = -1

/** Sorts colours by how they look, grey first, so a list's order never gives a seat away. */
export function useByLook(): <Color extends CubeColor>(colors: readonly Color[]) => Color[] {
  const { lookOf } = useViewer()
  const rank = (color: CubeColor) => (color === INDEPENDENT ? GREY_RANK : lookOf(seatOfColor(color)))
  return colors => [...colors].sort((a, b) => rank(a) - rank(b))
}
