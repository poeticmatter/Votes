import { BOARD } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { housingMoves } from './housing'
import { arrivalStations } from './immigration'
import { legalPlacements, PLACEABLE_KINDS } from './placement'
import { relocationMoves } from './relocation'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import type { CubeColor, Tile, VotesMove, VotesState } from './types'

// Builders for rules tests. Positions are set directly, so a test can start from any
// board without replaying the turns that would lead there.
//
// The map's towns, for reading the tests: A has its Residence at [1, 2] and Station at
// [1, 3]; B [5, 1] and [5, 0]; C [9, 2] and [9, 3]; D [1, 7] and [2, 7]; E [8, 7] and
// [7, 6]. The rail passes the Stations in the order E, C, B, A, D.

export const residence = (people: CubeColor[] = []): Tile => ({ kind: 'residence', people })
export const station = (people: CubeColor[] = []): Tile => ({ kind: 'station', people })
export const factory = (): Tile => ({ kind: 'factory' })
export const school = (): Tile => ({ kind: 'school' })

/** A new game with every starting Residence and Station empty, so tests place every person. */
export function newGame(playerCount = 2, seed = 7): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  const emptied = Object.fromEntries(
    Object.entries(state.tiles).map(([key, tile]) => [key, tile.kind === 'station' ? station() : residence()]),
  )
  return { ...state, tiles: emptied, firstPlayerIndex: 0, turn: { ...state.turn, playerIndex: 0 } }
}

export function withTiles(state: VotesState, tiles: Record<HexKey, Tile>): VotesState {
  return { ...state, tiles: { ...state.tiles, ...tiles } }
}

export function withBag(state: VotesState, bag: Partial<Record<CubeColor, number>>): VotesState {
  return { ...state, bag }
}

/** Fills the open hexes of `columns` with Factories, around whatever is already there. */
export function filledColumns(state: VotesState, columns: (col: number) => boolean): VotesState {
  const factories = Object.fromEntries(
    BOARD.hexes.filter(hex => hex.terrain === 'open' && columns(hex.col) && !state.tiles[hex.key]).map(hex => [hex.key, factory()]),
  )
  return withTiles(state, factories)
}

/** The hex that joins the two cities of {@link twoCities}. */
export const JOINING_HEX = '3,3'

/**
 * A board full of Factories except column 3: A and D are one city on the left, B, C and
 * E another on the right, and a tile on {@link JOINING_HEX} joins them into one.
 */
export function twoCities(state: VotesState): VotesState {
  return filledColumns(state, col => col !== 3)
}

/** Every move the active player could make now; a pass only when nothing can be placed. */
export function legalMoves(state: VotesState): VotesMove[] {
  const { phase } = state
  if (phase.kind === 'relocation') return relocationMoves(state).map(move => ({ kind: 'relocate', ...move }))
  if (phase.kind === 'immigration') return arrivalStations(state).map(station => ({ kind: 'arrive', station }))
  if (phase.kind === 'housing') return housingMoves(state).map(move => ({ kind: 'house', ...move }))
  if (phase.kind === 'gameOver') return []
  const placements = legalPlacements(state).flatMap(at => PLACEABLE_KINDS.map(tile => ({ kind: 'place' as const, tile, at })))
  return placements.length ? placements : [{ kind: 'pass' }]
}
