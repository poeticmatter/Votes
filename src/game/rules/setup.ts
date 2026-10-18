import { nextIndex } from 'game-kit/turns'
import { residenceSiteKey, stationKeyOf, TOWN_IDS } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import {
  INDEPENDENT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  RULES_VERSION,
  STARTING_PEOPLE_PER_PLAYER,
  STARTING_PEOPLE_PER_RESIDENCE,
  STARTING_RESIDENCE_COLORS,
  type CubeColor,
  type PlayerCount,
  type Tile,
  type TownColor,
  type VotesSettings,
  type VotesState,
} from './types'

/** The rules' playtest values. */
export const DEFAULT_SETTINGS: VotesSettings = {
  greyCubes: 10,
  startingCubesPerPlayer: 2,
  factoryArrivals: 3,
}

const STARTING_PEOPLE = TOWN_IDS.length * STARTING_PEOPLE_PER_RESIDENCE

export function isPlayerCount(count: number): count is PlayerCount {
  return Number.isInteger(count) && count >= MIN_PLAYERS && count <= MAX_PLAYERS
}

/** Grey cubes that top the seeded people up to 10: 4 in a 3-player game. */
export function greyPeopleAtSetup(playerCount: PlayerCount): number {
  return STARTING_PEOPLE - playerCount * STARTING_PEOPLE_PER_PLAYER
}

/** The fewest grey cubes that can seed the starting Residences at any player count. */
export const MIN_GREY_CUBES = greyPeopleAtSetup(MIN_PLAYERS)

interface Shuffled<T> {
  items: T[]
  randomState: number
}

function shuffle<T>(items: readonly T[], randomState: number): Shuffled<T> {
  const pool = [...items]
  const shuffled: T[] = []
  let state = randomState
  while (pool.length) {
    const { index, nextState } = nextIndex(state, pool.length)
    state = nextState
    shuffled.push(...pool.splice(index, 1))
  }
  return { items: shuffled, randomState: state }
}

/** Each town's starting Residence, its Station and the two people living there. */
function startingTiles(townColors: Record<TownId, TownColor>, peopleByTown: CubeColor[][]): Record<HexKey, Tile> {
  return Object.fromEntries(
    TOWN_IDS.flatMap((town, position): [HexKey, Tile][] => {
      const color = townColors[town]
      return [
        [residenceSiteKey(town), { kind: 'residence', color, town, people: peopleByTown[position] }],
        [stationKeyOf(town), { kind: 'station', color, town, people: [] }],
      ]
    }),
  )
}

function peopleInGroups(people: CubeColor[]): CubeColor[][] {
  return TOWN_IDS.map((_, position) =>
    people.slice(position * STARTING_PEOPLE_PER_RESIDENCE, (position + 1) * STARTING_PEOPLE_PER_RESIDENCE),
  )
}

export interface VotesSetup {
  settings: VotesSettings
  playerCount: number
  seed: number
}

export function createInitialState({ settings, playerCount, seed }: VotesSetup): VotesState {
  if (!isPlayerCount(playerCount)) throw new Error(`Votes is for ${MIN_PLAYERS}–${MAX_PLAYERS} players, not ${playerCount}`)
  // A lobby running an older deploy sends settings without the newer dials.
  if (typeof settings.factoryArrivals !== 'number') {
    throw new Error('These settings come from an older version of Votes; reload the page and start again')
  }
  const greyPeople = greyPeopleAtSetup(playerCount)
  const greyInBag = settings.greyCubes - greyPeople
  if (greyInBag < 0) {
    throw new Error(`${settings.greyCubes} grey cubes can't seed a ${playerCount}-player setup; it needs ${greyPeople}`)
  }

  const colors = PLAYER_COLORS.slice(0, playerCount)
  const { index: firstPlayerIndex, nextState: afterFirstPlayer } = nextIndex(seed >>> 0, playerCount)
  const dealtColors = shuffle(STARTING_RESIDENCE_COLORS, afterFirstPlayer)
  const townColors = Object.fromEntries(TOWN_IDS.map((town, position) => [town, dealtColors.items[position]])) as Record<
    TownId,
    TownColor
  >
  const startingPeople: CubeColor[] = [
    ...colors.flatMap(color => Array<CubeColor>(STARTING_PEOPLE_PER_PLAYER).fill(color)),
    ...Array<CubeColor>(greyPeople).fill(INDEPENDENT),
  ]
  const dealtPeople = shuffle(startingPeople, dealtColors.randomState)
  const bag: Partial<Record<CubeColor, number>> = {
    [INDEPENDENT]: greyInBag,
    ...Object.fromEntries(colors.map(color => [color, settings.startingCubesPerPlayer])),
  }

  return {
    rulesVersion: RULES_VERSION,
    players: colors.map(color => ({ color, score: 0 })),
    firstPlayerIndex,
    turn: { number: 1, playerIndex: firstPlayerIndex, placedAt: null },
    phase: { kind: 'placement' },
    tiles: startingTiles(townColors, peopleInGroups(dealtPeople.items)),
    townColors,
    cities: TOWN_IDS.map(town => [town]),
    mergers: [],
    bag,
    randomState: dealtPeople.randomState,
    factoryArrivals: settings.factoryArrivals,
    consecutivePasses: 0,
    elections: [],
    log: [],
  }
}
