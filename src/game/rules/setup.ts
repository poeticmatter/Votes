import { nextIndex } from 'game-kit/turns'
import { residenceSiteKey, TOWN_IDS } from '../map/board'
import { hexKey, type HexKey } from '../map/hexGrid'
import { STARTING_FACTORIES } from '../map/mapData'
import {
  INDEPENDENT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  RULES_VERSION,
  STARTING_RESIDENCES_PER_PLAYER,
  STARTING_PEOPLE_PER_PLAYER,
  STARTING_PEOPLE_PER_RESIDENCE,
  type CubeColor,
  type PlaceableKind,
  type PlayerCount,
  type Tile,
  type VotesSettings,
  type VotesState,
} from './types'

/** The rules' playtest values. */
export const DEFAULT_SETTINGS: VotesSettings = {
  startingCubesPerPlayer: 2,
  greyCubes: 10,
  tileCounts: { residence: 15, factory: 10, school: 5 },
}

const STARTING_PEOPLE = TOWN_IDS.length * STARTING_PEOPLE_PER_RESIDENCE

export function isPlayerCount(count: number): count is PlayerCount {
  return Number.isInteger(count) && count >= MIN_PLAYERS && count <= MAX_PLAYERS
}

/** Grey cubes that top the seeded people up to 10: 4 in a 3-player game. */
export function greyPeopleAtSetup(playerCount: PlayerCount): number {
  return STARTING_PEOPLE - playerCount * STARTING_PEOPLE_PER_PLAYER
}

/** The grey cubes left over after seeding go in the bag, with each player's cubes. */
function startingBag(settings: VotesSettings, playerCount: PlayerCount): VotesState['bag'] {
  const greyInBag = Math.max(0, settings.greyCubes - greyPeopleAtSetup(playerCount))
  return {
    [INDEPENDENT]: greyInBag,
    ...Object.fromEntries(PLAYER_COLORS.slice(0, playerCount).map(color => [color, settings.startingCubesPerPlayer])),
  }
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

/** Each town's starting Residence, with its two people, and the printed Factories. */
function startingTiles(peopleByTown: CubeColor[][]): Record<HexKey, Tile> {
  const towns = TOWN_IDS.map((town, position): [HexKey, Tile] => [
    residenceSiteKey(town),
    { kind: 'residence', isFaceDown: false, people: peopleByTown[position] },
  ])
  const factories = STARTING_FACTORIES.map(([col, row]): [HexKey, Tile] => [hexKey(col, row), { kind: 'factory', isFaceDown: false }])
  return Object.fromEntries([...towns, ...factories])
}

interface StartingSupplies {
  shared: Record<PlaceableKind, number>
  perPlayer: number
}

/** Each player takes their starting Residences from the shared supply, as many as it can spare evenly. */
function dealStartingResidences(tileCounts: Record<PlaceableKind, number>, playerCount: PlayerCount): StartingSupplies {
  const perPlayer = Math.min(STARTING_RESIDENCES_PER_PLAYER, Math.floor(tileCounts.residence / playerCount))
  return { shared: { ...tileCounts, residence: tileCounts.residence - perPlayer * playerCount }, perPlayer }
}

export interface VotesSetup {
  settings: VotesSettings
  playerCount: number
  seed: number
}

export function createInitialState({ settings, playerCount, seed }: VotesSetup): VotesState {
  if (!isPlayerCount(playerCount)) throw new Error(`Votes is for ${MIN_PLAYERS}–${MAX_PLAYERS} players, not ${playerCount}`)
  // A lobby running an older deploy sends its own set of dials.
  if (typeof settings.greyCubes !== 'number' || !settings.tileCounts || 'arrivals' in settings) {
    throw new Error('These settings come from an older version of Votes; reload the page and start again')
  }

  const colors = PLAYER_COLORS.slice(0, playerCount)
  const { shared, perPlayer } = dealStartingResidences(settings.tileCounts, playerCount)
  const { index: firstPlayerIndex, nextState: afterFirstPlayer } = nextIndex(seed >>> 0, playerCount)
  const { peopleByTown, randomState } = seedPeople(playerCount, afterFirstPlayer)

  return {
    rulesVersion: RULES_VERSION,
    players: colors.map(color => ({ color, score: 0, supply: { residence: perPlayer, factory: 0, school: 0 } })),
    firstPlayerIndex,
    turn: { number: 1, playerIndex: firstPlayerIndex, placedAt: null },
    phase: { kind: 'action' },
    tiles: startingTiles(peopleByTown),
    mergers: [],
    bag: startingBag(settings, playerCount),
    randomState,
    supply: shared,
    consecutivePasses: 0,
    elections: [],
    log: [],
  }
}
