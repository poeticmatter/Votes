import { nextIndex } from 'game-kit/turns'
import { residenceSiteKey, stationKeyOf, TOWN_IDS } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import {
  INDEPENDENT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  RULES_VERSION,
  STARTING_PEOPLE_PER_PLAYER,
  STARTING_PEOPLE_PER_RESIDENCE,
  type CubeColor,
  type PlayerCount,
  type Tile,
  type VotesSettings,
  type VotesState,
} from './types'

/** The rules' playtest values. */
export const DEFAULT_SETTINGS: VotesSettings = {
  startingCubesPerPlayer: 4,
  factoryArrivals: 3,
}

const STARTING_PEOPLE = TOWN_IDS.length * STARTING_PEOPLE_PER_RESIDENCE

export function isPlayerCount(count: number): count is PlayerCount {
  return Number.isInteger(count) && count >= MIN_PLAYERS && count <= MAX_PLAYERS
}

/** Grey cubes that top the seeded people up to 10: 4 in a 3-player game. Grey never enters the bag. */
export function greyPeopleAtSetup(playerCount: PlayerCount): number {
  return STARTING_PEOPLE - playerCount * STARTING_PEOPLE_PER_PLAYER
}

interface SeededPeople {
  peopleByTown: CubeColor[][]
  randomState: number
}

/** Deals the starting people to the starting Residences at random, two to each. */
function seedPeople(playerCount: PlayerCount, randomState: number): SeededPeople {
  const pool: CubeColor[] = [
    ...PLAYER_COLORS.slice(0, playerCount).flatMap(color => Array<CubeColor>(STARTING_PEOPLE_PER_PLAYER).fill(color)),
    ...Array<CubeColor>(greyPeopleAtSetup(playerCount)).fill(INDEPENDENT),
  ]
  const dealt: CubeColor[] = []
  let state = randomState
  while (pool.length) {
    const { index, nextState } = nextIndex(state, pool.length)
    state = nextState
    dealt.push(...pool.splice(index, 1))
  }
  const peopleByTown = TOWN_IDS.map((_, position) =>
    dealt.slice(position * STARTING_PEOPLE_PER_RESIDENCE, (position + 1) * STARTING_PEOPLE_PER_RESIDENCE),
  )
  return { peopleByTown, randomState: state }
}

/** Each town's starting Residence, with its two people, and its Station. */
function startingTiles(peopleByTown: CubeColor[][]): Record<HexKey, Tile> {
  return Object.fromEntries(
    TOWN_IDS.flatMap((town, position): [HexKey, Tile][] => [
      [residenceSiteKey(town), { kind: 'residence', people: peopleByTown[position] }],
      [stationKeyOf(town), { kind: 'station', people: [] }],
    ]),
  )
}

export interface VotesSetup {
  settings: VotesSettings
  playerCount: number
  seed: number
}

export function createInitialState({ settings, playerCount, seed }: VotesSetup): VotesState {
  if (!isPlayerCount(playerCount)) throw new Error(`Votes is for ${MIN_PLAYERS}–${MAX_PLAYERS} players, not ${playerCount}`)
  // A lobby running an older deploy sends its own set of dials.
  if ('greyCubes' in settings || typeof settings.factoryArrivals !== 'number') {
    throw new Error('These settings come from an older version of Votes; reload the page and start again')
  }

  const colors = PLAYER_COLORS.slice(0, playerCount)
  const { index: firstPlayerIndex, nextState: afterFirstPlayer } = nextIndex(seed >>> 0, playerCount)
  const { peopleByTown, randomState } = seedPeople(playerCount, afterFirstPlayer)

  return {
    rulesVersion: RULES_VERSION,
    players: colors.map(color => ({ color, score: 0 })),
    firstPlayerIndex,
    turn: { number: 1, playerIndex: firstPlayerIndex, placedAt: null },
    phase: { kind: 'placement' },
    tiles: startingTiles(peopleByTown),
    mergers: [],
    bag: Object.fromEntries(colors.map(color => [color, settings.startingCubesPerPlayer])),
    randomState,
    factoryArrivals: settings.factoryArrivals,
    consecutivePasses: 0,
    elections: [],
    log: [],
  }
}
