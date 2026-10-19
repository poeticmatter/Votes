import { BOARD, hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { citiesOnBoard } from './cities'
import {
  RESIDENCE_CAPACITY,
  type CubeColor,
  type PlayerState,
  type ResidenceTile,
  type StationTile,
  type Tile,
  type VotesState,
} from './types'

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

export function stations(state: VotesState): Located<StationTile>[] {
  return tilesInBoardOrder(state).filter((entry): entry is Located<StationTile> => entry.tile.kind === 'station')
}

export function stationsInCity(state: VotesState, city: TownId[]): Located<StationTile>[] {
  return tilesInCity(state, city).filter((entry): entry is Located<StationTile> => entry.tile.kind === 'station')
}

export function factoriesInCity(state: VotesState, city: TownId[]): Located<Tile>[] {
  return tilesInCity(state, city).filter(({ tile }) => tile.kind === 'factory')
}

/** A Factory scores 2 at elections when it borders the rail, otherwise 1. */
export function factoryPoints(key: HexKey): number {
  return hexAt(key).bordersRail ? 2 : 1
}

export function hasRoom(residence: ResidenceTile): boolean {
  return residence.people.length < RESIDENCE_CAPACITY
}

/** Residences and Stations hold people; other tiles hold none. */
export function peopleAt(state: VotesState, key: HexKey): CubeColor[] {
  const tile = state.tiles[key]
  return tile?.kind === 'residence' || tile?.kind === 'station' ? tile.people : []
}

/** Everyone in a Residence or waiting at a Station. */
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
