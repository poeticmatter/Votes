import { DISTRICT_IDS, startingResidenceKey } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { housingMoves } from './housing'
import { legalPlacements, TILE_KINDS } from './placement'
import { relocationMoves } from './relocation'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import type { CubeColor, PlayerColor, Tile, VotesMove, VotesState } from './types'

// Builders for rules tests. Positions are set directly, so a test can start from any
// board without replaying the turns that would lead there.

/** A new game with empty printed Residences and no printed Factories, so tests place every person and Factory. */
export function newGame(playerCount = 2, seed = 7): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  const bareResidences = Object.fromEntries(DISTRICT_IDS.map(district => [startingResidenceKey(district), residence(null)]))
  return { ...state, tiles: bareResidences, firstPlayerIndex: 0, turn: { ...state.turn, playerIndex: 0 } }
}

export function withTiles(state: VotesState, tiles: Record<HexKey, Tile>): VotesState {
  return { ...state, tiles: { ...state.tiles, ...tiles } }
}

export function withBag(state: VotesState, bag: Partial<Record<CubeColor, number>>): VotesState {
  return { ...state, bag }
}

export const residence = (owner: PlayerColor | null, people: CubeColor[] = []): Tile => ({ kind: 'residence', owner, people })
export const station = (owner: PlayerColor, people: CubeColor[] = []): Tile => ({ kind: 'station', owner, people })
export const factory = (): Tile => ({ kind: 'factory' })
export const school = (): Tile => ({ kind: 'school' })

/** Every move the active player could make now; a pass only when nothing can be placed. */
export function legalMoves(state: VotesState): VotesMove[] {
  const { phase } = state
  if (phase.kind === 'relocation') return relocationMoves(state).map(move => ({ kind: 'relocate', ...move }))
  if (phase.kind === 'housing') return housingMoves(state).map(move => ({ kind: 'house', ...move }))
  if (phase.kind === 'gameOver') return []
  const placements = TILE_KINDS.flatMap(tile => legalPlacements(state, tile).map(at => ({ kind: 'place' as const, tile, at })))
  return placements.length ? placements : [{ kind: 'pass' }]
}
