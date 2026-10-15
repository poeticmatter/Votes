import { BOARD, hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { DistrictId } from '../map/mapData'
import { JOBS_PER_FACTORY, type CubeColor, type PlayerState, type ResidenceTile, type StationTile, type Tile, type VotesState } from './types'

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

export function residences(state: VotesState): Located<ResidenceTile>[] {
  return tilesInBoardOrder(state).filter((entry): entry is Located<ResidenceTile> => entry.tile.kind === 'residence')
}

export function residencesIn(state: VotesState, district: DistrictId): Located<ResidenceTile>[] {
  return residences(state).filter(({ key }) => hexAt(key).district === district)
}

export function stations(state: VotesState): Located<StationTile>[] {
  return tilesInBoardOrder(state).filter((entry): entry is Located<StationTile> => entry.tile.kind === 'station')
}

export function factoryKeys(state: VotesState): HexKey[] {
  return tilesInBoardOrder(state)
    .filter(({ tile }) => tile.kind === 'factory')
    .map(({ key }) => key)
}

/** A Factory scores 2 at elections when it borders a rail, otherwise 1. */
export function factoryPoints(key: HexKey): number {
  return hexAt(key).bordersRail ? 2 : 1
}

export function familiesOnBoard(state: VotesState): CubeColor[] {
  return residences(state).flatMap(({ tile }) => tile.families)
}

export function openJobs(state: VotesState): number {
  return factoryKeys(state).length * JOBS_PER_FACTORY - familiesOnBoard(state).length
}

export function bagSize(state: VotesState): number {
  return Object.values(state.bag).reduce((sum, count) => sum + (count ?? 0), 0)
}

export function activePlayerState(state: VotesState): PlayerState {
  return state.players[state.turn.playerIndex]
}

export function cityOf(state: VotesState, district: DistrictId): DistrictId[] {
  const city = state.cities.find(candidate => candidate.includes(district))
  if (!city) throw new Error(`District ${district} belongs to no city`)
  return city
}

/** Player colours in turn order, starting with the first player. Breaks seat ties. */
export function turnOrderColors(state: VotesState): CubeColor[] {
  const count = state.players.length
  return state.players.map((_, offset) => state.players[(state.firstPlayerIndex + offset) % count].color)
}
