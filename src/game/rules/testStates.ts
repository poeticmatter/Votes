import { BOARD, TOWN_IDS } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { housingMoves } from './housing'
import { arrivalStations } from './immigration'
import { legalPlacements, PLACEABLE_KINDS } from './placement'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { splitColumn, startOf } from './testMap'
import type { CubeColor, Tile, VotesMove, VotesState } from './types'

// Builders for rules tests. Positions are set directly, so a test can start from any
// board without replaying the turns that would lead there. Where on the map a test
// puts things comes from testMap.ts.

export const residence = (people: CubeColor[] = []): Tile => ({ kind: 'residence', people })
export const station = (people: CubeColor[] = []): Tile => ({ kind: 'station', people })
export const factory = (): Tile => ({ kind: 'factory' })
export const mine = (): Tile => ({ kind: 'mine' })
export const school = (): Tile => ({ kind: 'school' })

export const fullResidence = (): Tile => residence(['grey', 'grey', 'grey'])

/** A new game with every starting Residence and Station empty, so tests place every person. */
export function newGame(playerCount = 3, seed = 7): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  const emptied = Object.fromEntries(
    Object.entries(state.tiles).map(([key, tile]): [HexKey, Tile] => {
      if (tile.kind === 'station') return [key, station()]
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

/** Every town's starting Residence full, so nobody can move into one. */
export const crowdedTowns = (): Record<HexKey, Tile> =>
  Object.fromEntries(TOWN_IDS.map(town => [startOf(town), fullResidence()]))

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

/** Every move the active player could make now; a pass only when nothing can be placed. */
export function legalMoves(state: VotesState): VotesMove[] {
  const { phase } = state
  if (phase.kind === 'immigration') return arrivalStations(state).map(station => ({ kind: 'arrive', station }))
  if (phase.kind === 'housing') return housingMoves(state).map(move => ({ kind: 'house', ...move }))
  if (phase.kind === 'gameOver') return []
  const placements = PLACEABLE_KINDS.flatMap(tile => legalPlacements(state, tile).map(at => ({ kind: 'place' as const, tile, at })))
  return placements.length ? placements : [{ kind: 'pass' }]
}
