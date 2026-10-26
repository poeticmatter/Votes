import { IllegalMoveError } from 'game-kit/turns'
import { BOARD, type Terrain } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { activePlayerState } from './boardQueries'
import type { PlaceableKind, Tile, VotesState } from './types'

export const PLACEABLE_KINDS: readonly PlaceableKind[] = ['residence', 'factory', 'mine', 'school']

/** Mines go only on mountains, and every other tile only on open hexes. */
export function terrainFor(kind: PlaceableKind): Terrain {
  return kind === 'mine' ? 'mountain' : 'open'
}

/** An empty hex of the tile's terrain, touching a tile or Station. */
function isLegalHex(state: VotesState, kind: PlaceableKind, at: HexKey): boolean {
  const hex = BOARD.hexByKey.get(at)
  if (!hex || hex.terrain !== terrainFor(kind) || state.tiles[at]) return false
  return hex.neighbors.some(({ key }) => state.tiles[key])
}

/** Hexes where the active player may place a tile of `kind` right now; none once the supply has run out. */
export function legalPlacements(state: VotesState, kind: PlaceableKind): HexKey[] {
  if (state.phase.kind !== 'placement' || state.supply[kind] === 0) return []
  return BOARD.hexes.filter(hex => isLegalHex(state, kind, hex.key)).map(hex => hex.key)
}

/** Kinds still in the supply that fit somewhere. */
export function placeableKinds(state: VotesState): PlaceableKind[] {
  return PLACEABLE_KINDS.filter(kind => legalPlacements(state, kind).length > 0)
}

export function hasAnyLegalPlacement(state: VotesState): boolean {
  return placeableKinds(state).length > 0
}

export function newTile(kind: PlaceableKind): Tile {
  return kind === 'residence' ? { kind, people: [] } : { kind }
}

/** Places a tile from the shared supply. */
export function placeTile(state: VotesState, kind: PlaceableKind, at: HexKey): VotesState {
  if (state.supply[kind] === 0) throw new IllegalMoveError(`There are no ${kind} tiles left`)
  if (!isLegalHex(state, kind, at)) throw new IllegalMoveError(`A ${kind} can't go on ${at}`)
  return {
    ...state,
    tiles: { ...state.tiles, [at]: newTile(kind) },
    supply: { ...state.supply, [kind]: state.supply[kind] - 1 },
    turn: { ...state.turn, placedAt: at },
    consecutivePasses: 0,
    log: [...state.log, { kind: 'placed', turn: state.turn.number, player: activePlayerState(state).color, tile: kind, at }],
  }
}
