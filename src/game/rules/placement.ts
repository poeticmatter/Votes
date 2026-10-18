import { IllegalMoveError } from 'game-kit/turns'
import { BOARD, hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { activePlayerState } from './boardQueries'
import { TOWN_COLORS, type PlaceableKind, type Tile, type TownColor, type VotesState } from './types'

export const PLACEABLE_KINDS: readonly PlaceableKind[] = ['residence', 'factory', 'school']

/** Towns with a tile of `color` next to `at`, each once, in board order. */
function neighboringTownsOfColor(state: VotesState, color: TownColor, at: HexKey): TownId[] {
  const towns = hexAt(at).neighbors.flatMap(({ key }) => {
    const tile = state.tiles[key]
    return tile?.color === color ? [tile.town] : []
  })
  return [...new Set(towns)]
}

/**
 * The town a `color` tile at `at` would join, or null if it can't go there: the hex must
 * be open and empty, next to a tile of the same colour, and must not connect two towns
 * of that colour. Every tile kind follows the same rule.
 */
export function townJoinedAt(state: VotesState, color: TownColor, at: HexKey): TownId | null {
  const hex = BOARD.hexByKey.get(at)
  if (!hex || hex.terrain !== 'open' || state.tiles[at]) return null
  const towns = neighboringTownsOfColor(state, color, at)
  return towns.length === 1 ? towns[0] : null
}

/** Hexes where the active player may place a tile of `color` right now. */
export function legalPlacements(state: VotesState, color: TownColor): HexKey[] {
  if (state.phase.kind !== 'placement') return []
  return BOARD.hexes.filter(hex => townJoinedAt(state, color, hex.key) !== null).map(hex => hex.key)
}

export function hasAnyLegalPlacement(state: VotesState): boolean {
  return TOWN_COLORS.some(color => legalPlacements(state, color).length > 0)
}

export function newTile(kind: PlaceableKind, color: TownColor, town: TownId): Tile {
  if (kind === 'residence') return { kind, color, town, people: [] }
  return { kind, color, town }
}

/** Places a tile from the shared supply, which never runs out. */
export function placeTile(state: VotesState, kind: PlaceableKind, color: TownColor, at: HexKey): VotesState {
  const town = townJoinedAt(state, color, at)
  if (!town) throw new IllegalMoveError(`A ${color} ${kind} can't go on ${at}`)

  return {
    ...state,
    tiles: { ...state.tiles, [at]: newTile(kind, color, town) },
    turn: { ...state.turn, placedAt: at },
    consecutivePasses: 0,
    log: [
      ...state.log,
      { kind: 'placed', turn: state.turn.number, player: activePlayerState(state).color, tile: kind, color, town, at },
    ],
  }
}
