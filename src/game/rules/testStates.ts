import { BOARD } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { withActivePlayer } from './placement'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { splitColumn } from './testMap'
import type { CubeColor, PlaceableKind, Tile, VotesState } from './types'

// Builders for rules tests. Positions are set directly, so a test can start from any
// board without replaying the turns that would lead there. Where on the map a test
// puts things comes from testMap.ts.

/** A face-up Residence: a seat, with `people` living there. */
export const residence = (people: CubeColor[] = []): Tile => ({ kind: 'residence', isFaceDown: false, people })
export const faceDownResidence = (): Tile => ({ kind: 'residence', isFaceDown: true, people: [] })
/** A face-up Factory, bringing people and scoring. */
export const factory = (): Tile => ({ kind: 'factory', isFaceDown: false })
export const faceDownFactory = (): Tile => ({ kind: 'factory', isFaceDown: true })
export const school = (): Tile => ({ kind: 'school', isUniversity: false })
export const university = (): Tile => ({ kind: 'school', isUniversity: true })

/** A new game with every starting Residence empty, so tests place every person. */
export function newGame(playerCount = 3, seed = 7): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  const emptied = Object.fromEntries(
    Object.entries(state.tiles).map(([key, tile]): [HexKey, Tile] => {
      if (tile.kind === 'residence') return [key, residence()]
      return [key, tile]
    }),
  )
  return { ...state, tiles: emptied, firstPlayerIndex: 0, turn: { ...state.turn, playerIndex: 0 } }
}

export function withTiles(state: VotesState, tiles: Record<HexKey, Tile>): VotesState {
  return { ...state, tiles: { ...state.tiles, ...tiles } }
}

export function withBag(state: VotesState, bag: Partial<Record<CubeColor, number>>): VotesState {
  return { ...state, bag }
}

/** Puts a tile of `kind` on each hex. */
export const tilesOn = (keys: HexKey[], make: () => Tile): Record<HexKey, Tile> => Object.fromEntries(keys.map(key => [key, make()]))

/** Fills the open hexes of `columns` with Factories, around whatever is already there. */
export function filledColumns(state: VotesState, columns: (col: number) => boolean): VotesState {
  const factories = Object.fromEntries(
    BOARD.hexes.filter(hex => hex.terrain === 'open' && columns(hex.col) && !state.tiles[hex.key]).map(hex => [hex.key, factory()]),
  )
  return withTiles(state, factories)
}

/**
 * A board full of Factories except one column of the map: two cities, and a tile on the
 * hex {@link joiningHex} joins them into one.
 */
export function twoCities(state: VotesState): VotesState {
  const { column } = splitColumn()
  return filledColumns(state, col => col !== column)
}

export const joiningHex = (): HexKey => splitColumn().joining

/** Gives the active player these tiles in their own supply, on top of what they have. */
export function withTilesInHand(state: VotesState, tiles: Partial<Record<PlaceableKind, number>>): VotesState {
  return withActivePlayer(state, player => ({
    ...player,
    supply: {
      residence: player.supply.residence + (tiles.residence ?? 0),
      factory: player.supply.factory + (tiles.factory ?? 0),
      school: player.supply.school + (tiles.school ?? 0),
    },
  }))
}
