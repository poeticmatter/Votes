import { BOARD } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { citiesOnBoard } from './cities'
import type { CubeColor, FactoryTile, PlayerColor, PlayerState, ResidenceTile, Tile, VotesState } from './types'

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

const isResidence = (entry: Located<Tile>): entry is Located<ResidenceTile> => entry.tile.kind === 'residence'
const isFactory = (entry: Located<Tile>): entry is Located<FactoryTile> => entry.tile.kind === 'factory'

/** The Residences: the seats, where people live. */
export function residences(state: VotesState): Located<ResidenceTile>[] {
  return tilesInBoardOrder(state).filter(isResidence)
}

/** The city's Residences. */
export function residencesInCity(state: VotesState, city: TownId[]): Located<ResidenceTile>[] {
  return tilesInCity(state, city).filter(isResidence)
}

/** Every Factory on the map. */
export function factories(state: VotesState): Located<FactoryTile>[] {
  return tilesInBoardOrder(state).filter(isFactory)
}

/** The city's Factories. */
export function factoriesInCity(state: VotesState, city: TownId[]): Located<FactoryTile>[] {
  return tilesInCity(state, city).filter(isFactory)
}

/** How many Factories the city has: each seat there scores 1 point per Factory. */
export function factoryCountIn(state: VotesState, city: TownId[]): number {
  return factoriesInCity(state, city).length
}

/** Every city that has a School, by its first town. Its Residences may pull from other cities. */
export function schoolCities(state: VotesState): Set<TownId> {
  return new Set(tilesInBoardOrder(state).flatMap(({ key, tile }) => (tile.kind === 'school' ? [cityAt(state, key)[0]] : [])))
}

/** The owners of the city's Schools, each once, in board order. */
export function schoolOwnersIn(state: VotesState, city: TownId[]): PlayerColor[] {
  const owners = tilesInCity(state, city).flatMap(({ tile }) => (tile.kind === 'school' ? [tile.owner] : []))
  return [...new Set(owners)]
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
