import { residenceSiteKey, stationKeyOf, TOWN_IDS } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { housingMoves } from './housing'
import { legalPlacements, PLACEABLE_KINDS } from './placement'
import { relocationMoves } from './relocation'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { TOWN_COLORS, type CubeColor, type Tile, type TownColor, type VotesMove, type VotesState } from './types'

// Builders for rules tests. Positions are set directly, so a test can start from any
// board without replaying the turns that would lead there.

/** Fixed town colours, so tests don't depend on the deal: A and D are both sand. */
export const TEST_TOWN_COLORS: Record<TownId, TownColor> = { A: 'sand', B: 'sage', C: 'slate', D: 'sand', E: 'sage' }

export const residence = (town: TownId, people: CubeColor[] = []): Tile => ({
  kind: 'residence',
  color: TEST_TOWN_COLORS[town],
  town,
  people,
})
export const station = (town: TownId, people: CubeColor[] = []): Tile => ({ kind: 'station', color: TEST_TOWN_COLORS[town], town, people })
export const factory = (town: TownId): Tile => ({ kind: 'factory', color: TEST_TOWN_COLORS[town], town })
export const school = (town: TownId): Tile => ({ kind: 'school', color: TEST_TOWN_COLORS[town], town })

/** A new game with {@link TEST_TOWN_COLORS} and nobody on the board, so tests place every person. */
export function newGame(playerCount = 2, seed = 7): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  const emptyTowns = Object.fromEntries(
    TOWN_IDS.flatMap(town => [
      [residenceSiteKey(town), residence(town)],
      [stationKeyOf(town), station(town)],
    ]),
  )
  return { ...state, tiles: emptyTowns, townColors: TEST_TOWN_COLORS, firstPlayerIndex: 0, turn: { ...state.turn, playerIndex: 0 } }
}

export function withTiles(state: VotesState, tiles: Record<HexKey, Tile>): VotesState {
  return { ...state, tiles: { ...state.tiles, ...tiles } }
}

export function withBag(state: VotesState, bag: Partial<Record<CubeColor, number>>): VotesState {
  return { ...state, bag }
}

/** Every move the active player could make now; a pass only when nothing can be placed. */
export function legalMoves(state: VotesState): VotesMove[] {
  const { phase } = state
  if (phase.kind === 'relocation') return relocationMoves(state).map(move => ({ kind: 'relocate', ...move }))
  if (phase.kind === 'housing') return housingMoves(state).map(move => ({ kind: 'house', ...move }))
  if (phase.kind === 'gameOver') return []
  const placements = TOWN_COLORS.flatMap(color =>
    legalPlacements(state, color).flatMap(at => PLACEABLE_KINDS.map(tile => ({ kind: 'place' as const, tile, color, at }))),
  )
  return placements.length ? placements : [{ kind: 'pass' }]
}
