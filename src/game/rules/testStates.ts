import type { HexKey } from '../map/hexGrid'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import type { CubeColor, PlayerColor, Tile, VotesState } from './types'

// Builders for rules tests. Positions are set directly, so a test can start from any
// board without replaying the turns that would lead there.

export function newGame(playerCount = 2, seed = 7): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  return { ...state, firstPlayerIndex: 0, turn: { ...state.turn, playerIndex: 0 } }
}

export function withTiles(state: VotesState, tiles: Record<HexKey, Tile>): VotesState {
  return { ...state, tiles: { ...state.tiles, ...tiles } }
}

export function withBag(state: VotesState, bag: Partial<Record<CubeColor, number>>): VotesState {
  return { ...state, bag }
}

export const residence = (owner: PlayerColor | null, families: CubeColor[] = []): Tile => ({
  kind: 'residence',
  owner,
  families,
})
export const station = (owner: PlayerColor): Tile => ({ kind: 'station', owner })
export const factory = (): Tile => ({ kind: 'factory' })
export const school = (): Tile => ({ kind: 'school' })
