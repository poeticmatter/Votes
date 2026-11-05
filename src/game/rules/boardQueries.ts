import { BOARD } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { citiesOnBoard } from './cities'
import type { CubeColor, PlayerState, ResidenceTile, Tile, VotesState } from './types'

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

const isFaceUpResidence = (entry: Located<Tile>): entry is Located<ResidenceTile> =>
  entry.tile.kind === 'residence' && !entry.tile.isFaceDown

/**
 * The face-up Residences: the seats, where people live. A face-down Residence is only a
 * promise, so it's left out.
 */
export function residences(state: VotesState): Located<ResidenceTile>[] {
  return tilesInBoardOrder(state).filter(isFaceUpResidence)
}

/** The city's face-up Residences. */
export function residencesInCity(state: VotesState, city: TownId[]): Located<ResidenceTile>[] {
  return tilesInCity(state, city).filter(isFaceUpResidence)
}

/** How many face-up Factories the city has: each seat there scores 1 point per Factory. */
export function faceUpFactoriesIn(state: VotesState, city: TownId[]): number {
  return tilesInCity(state, city).filter(({ tile }) => tile.kind === 'factory' && !tile.isFaceDown).length
}

/** Whether the tile at `key` is a face-down Residence or Factory, a promise not yet kept. */
export function isFaceDown(state: VotesState, key: HexKey): boolean {
  const tile = state.tiles[key]
  return (tile?.kind === 'residence' || tile?.kind === 'factory') && tile.isFaceDown
}

/**
 * How far a city's schooling goes: 0 with no School, 1 with a School, 2 with a
 * University. A city pulls people from cities that rank below it.
 */
export type SchoolRank = 0 | 1 | 2

/** Every city's {@link SchoolRank}, by its first town; a city that's missing ranks 0. */
export function schoolRanks(state: VotesState): Map<TownId, SchoolRank> {
  const ranks = new Map<TownId, SchoolRank>()
  for (const { key, tile } of tilesInBoardOrder(state)) {
    if (tile.kind !== 'school') continue
    const town = cityAt(state, key)[0]
    const rank: SchoolRank = tile.isUniversity ? 2 : 1
    if (rank > (ranks.get(town) ?? 0)) ranks.set(town, rank)
  }
  return ranks
}

/** Every city that has a School or a University, by its first town. */
export function schoolCities(state: VotesState): Set<TownId> {
  return new Set(schoolRanks(state).keys())
}

/** How many Schools and Universities the city has. */
export function schoolsIn(state: VotesState, city: TownId[]): number {
  return tilesInCity(state, city).filter(({ tile }) => tile.kind === 'school').length
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
