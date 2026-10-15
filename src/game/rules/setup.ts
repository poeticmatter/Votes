import { DISTRICT_IDS, startingResidenceKey } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { nextIndex } from './random'
import {
  INDEPENDENT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  STATIONS_PER_PLAYER,
  type CubeColor,
  type PlayerCount,
  type Tile,
  type VotesSettings,
  type VotesState,
} from './types'

/** The rules' playtest values. */
export const DEFAULT_SETTINGS: VotesSettings = {
  residencesByPlayerCount: { 2: 15, 3: 10, 4: 8, 5: 6 },
  greyCubes: 10,
  startingCubesPerPlayer: 3,
}

export function isPlayerCount(count: number): count is PlayerCount {
  return Number.isInteger(count) && count >= MIN_PLAYERS && count <= MAX_PLAYERS
}

function printedResidences(): Record<HexKey, Tile> {
  return Object.fromEntries(
    DISTRICT_IDS.map(district => [startingResidenceKey(district), { kind: 'residence', owner: null, families: [] }]),
  )
}

export interface VotesSetup {
  settings: VotesSettings
  playerCount: number
  seed: number
}

export function createInitialState({ settings, playerCount, seed }: VotesSetup): VotesState {
  if (!isPlayerCount(playerCount)) throw new Error(`Votes is for ${MIN_PLAYERS}–${MAX_PLAYERS} players, not ${playerCount}`)

  const colors = PLAYER_COLORS.slice(0, playerCount)
  const { index: firstPlayerIndex, nextState: randomState } = nextIndex(seed >>> 0, playerCount)
  const bag: Partial<Record<CubeColor, number>> = {
    [INDEPENDENT]: settings.greyCubes,
    ...Object.fromEntries(colors.map(color => [color, settings.startingCubesPerPlayer])),
  }

  return {
    players: colors.map(color => ({
      color,
      score: 0,
      residencesLeft: settings.residencesByPlayerCount[playerCount],
      stationsLeft: STATIONS_PER_PLAYER,
    })),
    firstPlayerIndex,
    turn: { number: 1, playerIndex: firstPlayerIndex, placedAt: null },
    phase: { kind: 'placement' },
    tiles: printedResidences(),
    cities: DISTRICT_IDS.map(district => [district]),
    mergers: [],
    bag,
    randomState,
    consecutivePasses: 0,
    elections: [],
    log: [],
  }
}
