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
  STARTING_CUBES_PER_FACTORY,
  STARTING_CUBES_PER_PLAYER,
  STARTING_CUBES_PER_RESIDENCE,
  type CubeColor,
  type PlayerColor,
  type PlayerCount,
  type Tile,
  type VotesSettings,
  type VotesState,
} from './types'

/** The rules' playtest values. */
export const DEFAULT_SETTINGS: VotesSettings = {
  tilesPerPlayer: { residence: 15, factory: 5, school: 1 },
  bagCubesPerPlayer: 4,
  bagSize: 20,
}

export function isPlayerCount(count: number): count is PlayerCount {
  return Number.isInteger(count) && count >= MIN_PLAYERS && count <= MAX_PLAYERS
}

/** `perPlayer` cubes of each player's colour, topped up with grey to `total`. */
function cubePool(colors: readonly PlayerColor[], perPlayer: number, total: number): CubeColor[] {
  const players = colors.flatMap(color => Array<CubeColor>(perPlayer).fill(color))
  return [...players, ...Array<CubeColor>(Math.max(0, total - players.length)).fill(INDEPENDENT)]
}

/** The bag's smallest size: every player's cubes, with no grey. */
export function smallestBag(settings: VotesSettings, playerCount: PlayerCount): number {
  return settings.bagCubesPerPlayer * playerCount
}

function countsOf(cubes: CubeColor[]): VotesState['bag'] {
  return cubes.reduce<VotesState['bag']>((bag, color) => ({ ...bag, [color]: (bag[color] ?? 0) + 1 }), {})
}

interface Dealt {
  groups: CubeColor[][]
  randomState: number
}

/** Shuffles `pool` and deals it into groups of `size`. */
function deal(pool: CubeColor[], size: number, randomState: number): Dealt {
  const left = [...pool]
  const shuffled: CubeColor[] = []
  let state = randomState
  while (left.length) {
    const { index, nextState } = nextIndex(state, left.length)
    state = nextState
    shuffled.push(...left.splice(index, 1))
  }
  const groups = Array.from({ length: shuffled.length / size }, (_, group) => shuffled.slice(group * size, (group + 1) * size))
  return { groups, randomState: state }
}

const STARTING_FACTORY_KEYS = STARTING_FACTORIES.map(([col, row]) => hexKey(col, row))

/** Each town's starting Residence and each printed Factory, owned by nobody, with the cubes dealt to them. */
function startingTiles(residentsByTown: CubeColor[][], cubesByFactory: CubeColor[][]): Record<HexKey, Tile> {
  const towns = TOWN_IDS.map((town, position): [HexKey, Tile] => [
    residenceSiteKey(town),
    { kind: 'residence', owner: null, people: residentsByTown[position] },
  ])
  const factories = STARTING_FACTORY_KEYS.map((key, position): [HexKey, Tile] => [key, { kind: 'factory', owner: null, cubes: cubesByFactory[position] }])
  return Object.fromEntries([...towns, ...factories])
}

export interface VotesSetup {
  settings: VotesSettings
  playerCount: number
  seed: number
}

export function createInitialState({ settings, playerCount, seed }: VotesSetup): VotesState {
  if (!isPlayerCount(playerCount)) throw new Error(`Votes is for ${MIN_PLAYERS}–${MAX_PLAYERS} players, not ${playerCount}`)
  // A lobby running an older deploy sends its own set of dials.
  if (!settings.tilesPerPlayer || typeof settings.bagSize !== 'number') {
    throw new Error('These settings come from an older version of Votes; reload the page and start again')
  }

  const colors = PLAYER_COLORS.slice(0, playerCount)
  const { index: firstPlayerIndex, nextState: afterFirstPlayer } = nextIndex(seed >>> 0, playerCount)
  const residents = deal(
    cubePool(colors, STARTING_CUBES_PER_PLAYER, TOWN_IDS.length * STARTING_CUBES_PER_RESIDENCE),
    STARTING_CUBES_PER_RESIDENCE,
    afterFirstPlayer,
  )
  const factoryCubes = deal(
    cubePool(colors, STARTING_CUBES_PER_PLAYER, STARTING_FACTORY_KEYS.length * STARTING_CUBES_PER_FACTORY),
    STARTING_CUBES_PER_FACTORY,
    residents.randomState,
  )

  return {
    rulesVersion: RULES_VERSION,
    players: colors.map(color => ({ color, score: 0, supply: { ...settings.tilesPerPlayer } })),
    firstPlayerIndex,
    turn: { number: 1, playerIndex: firstPlayerIndex, placedAt: null },
    phase: { kind: 'action' },
    tiles: startingTiles(residents.groups, factoryCubes.groups),
    mergers: [],
    bag: countsOf(cubePool(colors, settings.bagCubesPerPlayer, settings.bagSize)),
    randomState: factoryCubes.randomState,
    consecutivePasses: 0,
    elections: [],
    log: [],
  }
}
