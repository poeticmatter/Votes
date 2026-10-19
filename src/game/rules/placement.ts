import { IllegalMoveError } from 'game-kit/turns'
import { BOARD } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { activePlayerState } from './boardQueries'
import type { PlaceableKind, Tile, VotesState } from './types'

export const PLACEABLE_KINDS: readonly PlaceableKind[] = ['residence', 'factory', 'school']

/** An open, empty hex touching a tile or Station. Every kind of tile goes by the same rule. */
function isLegalHex(state: VotesState, at: HexKey): boolean {
  const hex = BOARD.hexByKey.get(at)
  if (!hex || hex.terrain !== 'open' || state.tiles[at]) return false
  return hex.neighbors.some(({ key }) => state.tiles[key])
}

/** Hexes where the active player may place a tile right now. */
export function legalPlacements(state: VotesState): HexKey[] {
  if (state.phase.kind !== 'placement') return []
  return BOARD.hexes.filter(hex => isLegalHex(state, hex.key)).map(hex => hex.key)
}

export function hasAnyLegalPlacement(state: VotesState): boolean {
  return legalPlacements(state).length > 0
}

export function newTile(kind: PlaceableKind): Tile {
  return kind === 'residence' ? { kind, people: [] } : { kind }
}

/** Places a tile from the shared supply, which never runs out. */
export function placeTile(state: VotesState, kind: PlaceableKind, at: HexKey): VotesState {
  if (!isLegalHex(state, at)) throw new IllegalMoveError(`A ${kind} can't go on ${at}`)
  return {
    ...state,
    tiles: { ...state.tiles, [at]: newTile(kind) },
    turn: { ...state.turn, placedAt: at },
    consecutivePasses: 0,
    log: [...state.log, { kind: 'placed', turn: state.turn.number, player: activePlayerState(state).color, tile: kind, at }],
  }
}
