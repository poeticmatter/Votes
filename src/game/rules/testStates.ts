import { BOARD } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { PLACEABLE_KINDS, withActivePlayer } from './placement'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { splitColumn } from './testMap'
import type { CubeColor, PlaceableKind, PlayerColor, Tile, VotesState } from './types'

// Builders for rules tests. Positions are set directly, so a test can start from any
// board without replaying the turns that would lead there. Where on the map a test
// puts things comes from testMap.ts.

/** A Residence: a seat, with `people` living there; owned by nobody unless given. */
export const residence = (people: CubeColor[] = [], owner: PlayerColor | null = null): Tile => ({ kind: 'residence', owner, people })
/** A Factory holding `cubes`; owned by nobody unless given. */
export const factory = (cubes: CubeColor[] = [], owner: PlayerColor | null = null): Tile => ({ kind: 'factory', owner, cubes })
export const school = (owner: PlayerColor = 'pink'): Tile => ({ kind: 'school', owner })

/** A new game with every starting Residence and printed Factory empty, and an empty bag, so tests place every cube. */
export function newGame(playerCount = 3, seed = 7): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  const emptied = Object.fromEntries(
    Object.entries(state.tiles).map(([key, tile]): [HexKey, Tile] => [key, tile.kind === 'factory' ? factory() : residence()]),
  )
  return { ...state, tiles: emptied, bag: {}, firstPlayerIndex: 0, turn: { ...state.turn, playerIndex: 0 } }
}

export function withTiles(state: VotesState, tiles: Record<HexKey, Tile>): VotesState {
  return { ...state, tiles: { ...state.tiles, ...tiles } }
}

export function withBag(state: VotesState, bag: Partial<Record<CubeColor, number>>): VotesState {
  return { ...state, bag }
}

/** The active player's supply holds exactly these tiles. */
export function withHand(state: VotesState, tiles: Partial<Record<PlaceableKind, number>>): VotesState {
  return withActivePlayer(state, player => ({
    ...player,
    supply: Object.fromEntries(PLACEABLE_KINDS.map(kind => [kind, tiles[kind] ?? 0])) as Record<PlaceableKind, number>, // fromEntries loses the keys; PLACEABLE_KINDS covers every kind.
  }))
}

/** The pulling step of pink's turn. */
export const pulling = (state: VotesState): VotesState => ({ ...state, phase: { kind: 'pulling' } })

/** Puts a tile made by `make` on each hex. */
export const tilesOn = (keys: HexKey[], make: () => Tile): Record<HexKey, Tile> => Object.fromEntries(keys.map(key => [key, make()]))

/**
 * Fills the open hexes of `columns` with empty Factories owned by nobody, around whatever
 * is already there: tiles that join cities, hold no people and offer none.
 */
export function filledColumns(state: VotesState, columns: (col: number) => boolean): VotesState {
  const keys = BOARD.hexes.filter(hex => hex.terrain === 'open' && columns(hex.col) && !state.tiles[hex.key]).map(hex => hex.key)
  return withTiles(state, tilesOn(keys, () => factory()))
}

/**
 * A board full of empty Factories except one column of the map: two cities, and a tile
 * on the hex {@link joiningHex} joins them into one.
 */
export function twoCities(state: VotesState): VotesState {
  const { column } = splitColumn()
  return filledColumns(state, col => col !== column)
}

export const joiningHex = (): HexKey => splitColumn().joining
