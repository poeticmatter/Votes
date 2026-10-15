import { nextIndex } from 'game-kit/turns'
import { DISTRICT_IDS, startingResidenceKey } from '../map/board'
import { hexKey, type HexKey } from '../map/hexGrid'
import { STARTING_FACTORIES } from '../map/mapData'
import {
  INDEPENDENT,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_COLORS,
  STARTING_FAMILIES_PER_PLAYER,
  STARTING_FAMILIES_PER_RESIDENCE,
  STATIONS_PER_PLAYER,
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
}

const STARTING_FAMILIES = DISTRICT_IDS.length * STARTING_FAMILIES_PER_RESIDENCE

export function isPlayerCount(count: number): count is PlayerCount {
  return Number.isInteger(count) && count >= MIN_PLAYERS && count <= MAX_PLAYERS
}

/** Grey cubes that top the seeded families up to one full set: 4 in a 3-player game. */
export function greyFamiliesAtSetup(playerCount: PlayerCount): number {
  return STARTING_FAMILIES - playerCount * STARTING_FAMILIES_PER_PLAYER
}

/** The fewest grey cubes that can seed the printed Residences at any player count. */
export const MIN_GREY_CUBES = greyFamiliesAtSetup(MIN_PLAYERS)

interface SeededFamilies {
  familiesByDistrict: CubeColor[][]
  randomState: number
}

/** Deals the starting families to the printed Residences at random, two to each. */
function seedFamilies(colors: readonly PlayerColor[], greyCount: number, randomState: number): SeededFamilies {
  const pool: CubeColor[] = [
    ...colors.flatMap(color => Array<CubeColor>(STARTING_FAMILIES_PER_PLAYER).fill(color)),
    ...Array<CubeColor>(greyCount).fill(INDEPENDENT),
  ]
  const dealt: CubeColor[] = []
  let state = randomState
  while (pool.length) {
    const { index, nextState } = nextIndex(state, pool.length)
    state = nextState
    dealt.push(...pool.splice(index, 1))
  }
  const familiesByDistrict = DISTRICT_IDS.map((_, position) =>
    dealt.slice(position * STARTING_FAMILIES_PER_RESIDENCE, (position + 1) * STARTING_FAMILIES_PER_RESIDENCE),
  )
  return { familiesByDistrict, randomState: state }
}

function printedTiles(familiesByDistrict: CubeColor[][]): Record<HexKey, Tile> {
  const residences = DISTRICT_IDS.map((district, position): [HexKey, Tile] => [
    startingResidenceKey(district),
    { kind: 'residence', owner: null, families: familiesByDistrict[position] },
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
  const greyFamilies = greyFamiliesAtSetup(playerCount)
  const greyInBag = settings.greyCubes - greyFamilies
  if (greyInBag < 0) {
    throw new Error(`${settings.greyCubes} grey cubes can't seed a ${playerCount}-player setup; it needs ${greyFamilies}`)
  }

  const colors = PLAYER_COLORS.slice(0, playerCount)
  const { index: firstPlayerIndex, nextState: afterFirstPlayer } = nextIndex(seed >>> 0, playerCount)
  const { familiesByDistrict, randomState } = seedFamilies(colors, greyFamilies, afterFirstPlayer)
  const bag: Partial<Record<CubeColor, number>> = {
    [INDEPENDENT]: greyInBag,
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
    tiles: printedTiles(familiesByDistrict),
    cities: DISTRICT_IDS.map(district => [district]),
    mergers: [],
    bag,
    randomState,
    consecutivePasses: 0,
    elections: [],
    log: [],
  }
}
