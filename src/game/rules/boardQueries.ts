import { BOARD, hexAt, stationKeyOf } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import {
  RESIDENCE_CAPACITY,
  type BuildingTile,
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

export function tilesInCity(state: VotesState, city: TownId[]): Located<Tile>[] {
  return tilesInBoardOrder(state).filter(({ tile }) => city.includes(tile.town))
}

/** The town of the tile at `key`, which must hold one. */
export function townOf(state: VotesState, key: HexKey): TownId {
  const tile = state.tiles[key]
  if (!tile) throw new Error(`No tile at ${key}`)
  return tile.town
}

export function residences(state: VotesState): Located<ResidenceTile>[] {
  return tilesInBoardOrder(state).filter((entry): entry is Located<ResidenceTile> => entry.tile.kind === 'residence')
}

export function residencesInCity(state: VotesState, city: TownId[]): Located<ResidenceTile>[] {
  return residences(state).filter(({ tile }) => city.includes(tile.town))
}

export function stations(state: VotesState): Located<StationTile>[] {
  return tilesInBoardOrder(state).filter((entry): entry is Located<StationTile> => entry.tile.kind === 'station')
}

export function stationOf(state: VotesState, town: TownId): Located<StationTile> {
  const key = stationKeyOf(town)
  const tile = state.tiles[key]
  if (tile?.kind !== 'station') throw new Error(`Town ${town} has no Station at ${key}`)
  return { key, tile }
}

export function factoriesInCity(state: VotesState, city: TownId[]): Located<Tile>[] {
  return tilesInCity(state, city).filter(({ tile }) => tile.kind === 'factory')
}

/** A Factory scores 2 at elections when it borders a rail, otherwise 1. */
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

export function cityOf(state: VotesState, town: TownId): TownId[] {
  const city = state.cities.find(candidate => candidate.includes(town))
  if (!city) throw new Error(`Town ${town} belongs to no city`)
  return city
}
