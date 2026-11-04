import { BOARD, hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { citiesOnBoard } from './cities'
import type { CubeColor, IndustryKind, PlayerState, ResidenceTile, Tile, VotesState } from './types'

// Read-only questions about a state, shared by the rules and the UI. Every list walks
// the map in board order, never object-key order, so results are deterministic.

export interface Located<T> {
  key: HexKey
  tile: T
}

export function tilesInBoardOrder(state: VotesState): Located<Tile>[] {
  return BOARD.hexes.flatMap(hex => {
    const tile = state.tiles[hex.key]
    return tile ? [{ key: hex.key, tile }] : []
  })
}

/** Every city, as the towns it holds. */
export function citiesOf(state: VotesState): TownId[][] {
  return citiesOnBoard(state.tiles).list
}

/** The city holding the tile at `key`. */
export function cityAt(state: VotesState, key: HexKey): TownId[] {
  const city = citiesOnBoard(state.tiles).byHex.get(key)
  if (!city) throw new Error(`No tile at ${key}`)
  return city
}

function tilesInCity(state: VotesState, city: TownId[]): Located<Tile>[] {
  const byHex = citiesOnBoard(state.tiles).byHex
  return tilesInBoardOrder(state).filter(({ key }) => byHex.get(key)?.[0] === city[0])
}

export function residences(state: VotesState): Located<ResidenceTile>[] {
  return tilesInBoardOrder(state).filter((entry): entry is Located<ResidenceTile> => entry.tile.kind === 'residence')
}

export function residencesInCity(state: VotesState, city: TownId[]): Located<ResidenceTile>[] {
  return tilesInCity(state, city).filter((entry): entry is Located<ResidenceTile> => entry.tile.kind === 'residence')
}

export interface IndustryTile {
  kind: IndustryKind
}

const isIndustry = (entry: Located<Tile>): entry is Located<IndustryTile> =>
  entry.tile.kind === 'factory' || entry.tile.kind === 'mine'

/** The city's Factories and Mines. */
export function industryInCity(state: VotesState, city: TownId[]): Located<IndustryTile>[] {
  return tilesInCity(state, city).filter(isIndustry)
}

const MINE_VALUE = 2
const FACTORY_BASE_VALUE = 1

/**
 * What the Factory or Mine at `key` adds to its city's value at elections, as the board
 * stands: a Mine 2; a Factory 1, +1 if it touches a Mine.
 * The tile needn't be placed yet, so this also previews a placement.
 */
export function industryValue(state: VotesState, kind: IndustryKind, key: HexKey): number {
  if (kind === 'mine') return MINE_VALUE
  const touchesMine = hexAt(key).neighbors.some(neighbor => state.tiles[neighbor.key]?.kind === 'mine')
  return FACTORY_BASE_VALUE + Number(touchesMine)
}

/** The value of the city's Factories and Mines added up. */
export function cityValue(state: VotesState, city: TownId[]): number {
  return industryInCity(state, city).reduce((total, { key, tile }) => total + industryValue(state, tile.kind, key), 0)
}

/** Every city that has a School, by its first town. */
export function schoolCities(state: VotesState): Set<TownId> {
  return new Set(tilesInBoardOrder(state).flatMap(({ key, tile }) => (tile.kind === 'school' ? [cityAt(state, key)[0]] : [])))
}

/** Only Residences hold people. */
export function peopleAt(state: VotesState, key: HexKey): CubeColor[] {
  const tile = state.tiles[key]
  return tile?.kind === 'residence' ? tile.people : []
}

/** How many people live in the Residence at `key`. */
export function crowdOf(state: VotesState, key: HexKey): number {
  return peopleAt(state, key).length
}

/** Everyone on the board: they all live in Residences. */
export function peopleOnBoard(state: VotesState): CubeColor[] {
  return tilesInBoardOrder(state).flatMap(({ key }) => peopleAt(state, key))
}

/** Each colour once, in the order it first appears. */
export function distinctColors(people: readonly CubeColor[]): CubeColor[] {
  return [...new Set(people)]
}

export function bagSize(state: VotesState): number {
  return Object.values(state.bag).reduce((sum, count) => sum + (count ?? 0), 0)
}

export function activePlayerState(state: VotesState): PlayerState {
  return state.players[state.turn.playerIndex]
}
