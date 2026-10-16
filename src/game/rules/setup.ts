import { nextIndex } from 'game-kit/turns'
import { DISTRICT_IDS, startingResidenceKey } from '../map/board'
import { hexKey, type HexKey } from '../map/hexGrid'
import { STARTING_FACTORIES } from '../map/mapData'
import {
  INDEPENDENT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  STARTING_PEOPLE_PER_PLAYER,
  STARTING_PEOPLE_PER_RESIDENCE,
  RULES_VERSION,
  STATIONS_BY_PLAYER_COUNT,
  type CubeColor,
  type PlayerColor,
  type PlayerCount,
  type Tile,
  type VotesSettings,
  type VotesState,
} from './types'

/** The rules' playtest values. */
export const DEFAULT_SETTINGS: VotesSettings = {
  residencesByPlayerCount: { 2: 15, 3: 10, 4: 8, 5: 6 },
  greyCubes: 10,
  startingCubesPerPlayer: 2,
  arrivals: { perStation: 2, perFactory: 2 },
}

const STARTING_PEOPLE = DISTRICT_IDS.length * STARTING_PEOPLE_PER_RESIDENCE

export function isPlayerCount(count: number): count is PlayerCount {
  return Number.isInteger(count) && count >= MIN_PLAYERS && count <= MAX_PLAYERS
}

/** Grey cubes that top the seeded people up to 10: 4 in a 3-player game. */
export function greyPeopleAtSetup(playerCount: PlayerCount): number {
  return STARTING_PEOPLE - playerCount * STARTING_PEOPLE_PER_PLAYER
}

/** The fewest grey cubes that can seed the printed Residences at any player count. */
export const MIN_GREY_CUBES = greyPeopleAtSetup(MIN_PLAYERS)

interface SeededPeople {
  peopleByDistrict: CubeColor[][]
  randomState: number
}

/** Deals the starting people to the printed Residences at random, two to each. */
function seedPeople(colors: readonly PlayerColor[], greyCount: number, randomState: number): SeededPeople {
  const pool: CubeColor[] = [
    ...colors.flatMap(color => Array<CubeColor>(STARTING_PEOPLE_PER_PLAYER).fill(color)),
    ...Array<CubeColor>(greyCount).fill(INDEPENDENT),
  ]
  const dealt: CubeColor[] = []
  let state = randomState
  while (pool.length) {
    const { index, nextState } = nextIndex(state, pool.length)
    state = nextState
    dealt.push(...pool.splice(index, 1))
  }
  const peopleByDistrict = DISTRICT_IDS.map((_, position) =>
    dealt.slice(position * STARTING_PEOPLE_PER_RESIDENCE, (position + 1) * STARTING_PEOPLE_PER_RESIDENCE),
  )
  return { peopleByDistrict, randomState: state }
}

function printedTiles(peopleByDistrict: CubeColor[][]): Record<HexKey, Tile> {
  const residences = DISTRICT_IDS.map((district, position): [HexKey, Tile] => [
    startingResidenceKey(district),
    { kind: 'residence', owner: null, people: peopleByDistrict[position] },
  ])
  const factories = STARTING_FACTORIES.map(([col, row]): [HexKey, Tile] => [hexKey(col, row), { kind: 'factory' }])
  return Object.fromEntries([...residences, ...factories])
}

export interface VotesSetup {
  settings: VotesSettings
  playerCount: number
  seed: number
}

export function createInitialState({ settings, playerCount, seed }: VotesSetup): VotesState {
  if (!isPlayerCount(playerCount)) throw new Error(`Votes is for ${MIN_PLAYERS}–${MAX_PLAYERS} players, not ${playerCount}`)
  // A lobby running an older deploy sends settings without the newer dials.
  if (!settings.arrivals) throw new Error('These settings come from an older version of Votes; reload the page and start again')
  const greyPeople = greyPeopleAtSetup(playerCount)
  const greyInBag = settings.greyCubes - greyPeople
  if (greyInBag < 0) {
    throw new Error(`${settings.greyCubes} grey cubes can't seed a ${playerCount}-player setup; it needs ${greyPeople}`)
  }

  const colors = PLAYER_COLORS.slice(0, playerCount)
  const { index: firstPlayerIndex, nextState: afterFirstPlayer } = nextIndex(seed >>> 0, playerCount)
  const { peopleByDistrict, randomState } = seedPeople(colors, greyPeople, afterFirstPlayer)
  const bag: Partial<Record<CubeColor, number>> = {
    [INDEPENDENT]: greyInBag,
    ...Object.fromEntries(colors.map(color => [color, settings.startingCubesPerPlayer])),
  }

  return {
    rulesVersion: RULES_VERSION,
    players: colors.map(color => ({
      color,
      score: 0,
      residencesLeft: settings.residencesByPlayerCount[playerCount],
      stationsLeft: STATIONS_BY_PLAYER_COUNT[playerCount],
    })),
    firstPlayerIndex,
    turn: { number: 1, playerIndex: firstPlayerIndex, placedAt: null },
    phase: { kind: 'placement' },
    tiles: printedTiles(peopleByDistrict),
    cities: DISTRICT_IDS.map(district => [district]),
    mergers: [],
    bag,
    randomState,
    arrivals: settings.arrivals,
    consecutivePasses: 0,
    elections: [],
    log: [],
  }
}
