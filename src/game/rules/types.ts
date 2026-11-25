import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'

/**
 * Seat order: seat 0 is pink, seat 1 vermillion, and so on. These are the ids kept in
 * the game state; the names players see (Orchid, Cobalt, ...) live in ui/pieceColors.ts.
 */
export const PLAYER_COLORS = ['pink', 'vermillion', 'blue', 'yellow', 'green'] as const

export type PlayerColor = (typeof PLAYER_COLORS)[number]

/** Grey cubes are independents: people no player brought in, who never vote. */
export const INDEPENDENT = 'grey' as const

/** A cube is a person. */
export type CubeColor = PlayerColor | typeof INDEPENDENT

export type PlayerCount = 3 | 4 | 5

export const MIN_PLAYERS: PlayerCount = 3
export const MAX_PLAYERS: PlayerCount = 5

/** Cubes dealt onto each starting Residence at setup. */
export const STARTING_CUBES_PER_RESIDENCE = 2
/** The printed Factories' share of the cubes dealt at setup, per Factory, before any grey moves to its town. */
export const STARTING_CUBES_PER_FACTORY = 5
/** Grey people a printed Factory's town starts with on top of its dealt ones, taken from the Factory's share while it has grey. */
export const GREYS_FOR_FACTORY_TOWNS = 1
/** Cubes of each player's colour among those dealt onto the starting Residences, and again onto the printed Factories. */
export const STARTING_CUBES_PER_PLAYER = 2

/** Cubes a placed Factory draws from the bag. */
export const FACTORY_DRAW = 5
/** A Residence pulls from Factories only while it holds fewer than this many people. */
export const FACTORY_PULL_LIMIT = 3
/** A Residence pulls from another Residence that has at least this many more people. */
export const RESIDENCE_PULL_GAP = 2

export type PlaceableKind = 'residence' | 'factory' | 'school'

/** The [bracketed] playtest dials. */
export interface VotesSettings {
  /** Tiles each player starts with in their own supply. */
  tilesPerPlayer: Record<PlaceableKind, number>
  /** Cubes of each player's colour in the bag at setup. */
  bagCubesPerPlayer: number
  /** Cubes in the bag at setup: the players' cubes, topped up with grey. */
  bagSize: number
}

/**
 * A Residence is a seat and has no capacity. Its owner, the player who placed it, is the
 * only one who may pull people into it; anyone may pull into a starting Residence, which
 * has no owner.
 */
export interface ResidenceTile {
  kind: 'residence'
  owner: PlayerColor | null
  /** People living here, in the order they moved in. */
  people: CubeColor[]
}

/**
 * Cubes wait on a Factory until a Residence pulls them in. Each time one leaves, its owner
 * adds 1 of their cubes to the bag; a printed Factory, owned by nobody, adds a grey one.
 */
export interface FactoryTile {
  kind: 'factory'
  owner: PlayerColor | null
  cubes: CubeColor[]
}

/** Its city's Residences may pull from other cities; its owner adds a cube to the bag for each person who comes. */
export interface SchoolTile {
  kind: 'school'
  owner: PlayerColor
}

export type Tile = ResidenceTile | FactoryTile | SchoolTile

export interface PlayerState {
  color: PlayerColor
  score: number
  /** Tiles in the player's own supply, waiting to be placed. */
  supply: Record<PlaceableKind, number>
}

export type Phase =
  /** Place a tile, or pass if none fits. */
  | { kind: 'action' }
  /** Pull people into Residences, as many as the player likes, until they end the turn. */
  | { kind: 'pulling' }
  | { kind: 'gameOver'; winners: PlayerColor[] }

export interface TurnState {
  number: number
  /** Index into {@link VotesState.players}. */
  playerIndex: number
  /** Where this turn's tile went; null before placing, or if the player passed. */
  placedAt: HexKey | null
}

/** A merger marker on the edge where two cities joined. */
export interface MergerMarker {
  number: number
  between: [HexKey, HexKey]
}

/** Why a Residence's seat went where it did: the most voters, the leftmost of a tie, or nobody's when nobody there votes. */
export type SeatReason = 'mostPeople' | 'leftmostOfTie' | 'noVoters'

/** Every Residence is a seat. */
export interface SeatResult {
  residence: HexKey
  /** Who lived there when the city voted. */
  people: CubeColor[]
  /** Null when nobody there votes: the Residence is empty, or holds only grey people. */
  winner: PlayerColor | null
  reason: SeatReason
}

/** The vote in one city, newly merged or (for a preview) as it stands. */
export interface ElectionResult {
  number: number
  turn: number
  /** The towns that make up the city. */
  city: TownId[]
  seats: SeatResult[]
  seatsByColor: Partial<Record<CubeColor, number>>
  /** Each seat scores its holder 1 point per Factory in the city. */
  pointsPerSeat: number
  /** Points for each player holding a seat: the points per seat for every one. */
  scores: Partial<Record<PlayerColor, number>>
}

/** Why cubes went into the bag: a Factory gave up a cube, a School drew someone from another city, or seats were won at a merger. */
export type BagReason = 'factory' | 'school' | 'seats'

export type LogEntry =
  | { kind: 'placed'; turn: number; player: PlayerColor; tile: PlaceableKind; at: HexKey }
  /** A placed Factory drew `count` cubes from the bag. */
  | { kind: 'stocked'; turn: number; at: HexKey; count: number }
  | { kind: 'passed'; turn: number; player: PlayerColor }
  /** A person drawn from the bag into a Residence, after a merger. */
  | { kind: 'arrived'; turn: number; color: CubeColor; residence: HexKey }
  /** A person pulled from a Factory or another Residence. */
  | { kind: 'pulled'; turn: number; color: CubeColor; from: HexKey; to: HexKey }
  /** `count` cubes of `color` went into the bag. */
  | { kind: 'bagged'; turn: number; color: CubeColor; count: number; reason: BagReason }
  | { kind: 'merger'; turn: number; city: TownId[]; electionNumber: number }
  | { kind: 'gameOver'; turn: number; winners: PlayerColor[]; reason: 'lastMerger' | 'nobodyCanAct' }

/**
 * Bump this whenever the rules or the saved state's shape change, so a game saved by
 * another version (an async room, or a browser still running an older deploy) is
 * recognised instead of misread. 2 is Draft 5.4, 3 Draft 5.7 with town colours, 4 the
 * same on the mountains-only map, 5 the first Draft 5.8, 6 Draft 5.8 with neighboring
 * cities and ties going left, 7 the redrawn map with its printed Factory, 8 Draft 5.10
 * (Mines, a tile supply, the payout table), 9 Schools taking from Stations and from
 * Residences beside the rail, 10 Schools filling every Residence they touch, 11 Draft
 * 5.11 (no relocation; a School widens its city's housing, one School per city), 12
 * the 7-row map, 13 Draft 5.12 (no rail or Stations; arrivals into the least crowded
 * Residence, levelling and School pulls), 14 grey people not voting, 15 Draft 5.13 (one
 * action a turn, face-down promises, players' own supplies, Universities, no Mines or
 * payout table), 16 the proposed rule options (Hubs, Ports, eminent domain, personal
 * tiles, cubes per tile), 17 a Factory that brings people to its own city, 18 no eminent
 * domain, 19 two-hex Factories holding cubes, Residences drawing people, a shared pool
 * placed from directly, end-of-turn levelling, 20 a cube in the bag per seat won at a
 * merger, 21 owned tiles, one-hex Factories stocked from the bag, voluntary pulls, two
 * printed Factories, 22 a grey person moved from each printed Factory to its town.
 */
export const RULES_VERSION = 22

export interface VotesState {
  /** {@link RULES_VERSION} when the game was created; missing in games from before it existed. */
  rulesVersion: number
  /** In seat order. */
  players: PlayerState[]
  firstPlayerIndex: number
  turn: TurnState
  phase: Phase
  /** Every tile on the map. Cities are never stored: they are the groups of connected tiles. */
  tiles: Record<HexKey, Tile>
  mergers: MergerMarker[]
  bag: Partial<Record<CubeColor, number>>
  /** Seeded generator state, so every client draws the same cubes. */
  randomState: number
  /** Turns in a row in which the player could place nothing. */
  consecutivePasses: number
  elections: ElectionResult[]
  log: LogEntry[]
}

/**
 * One person pulled into the Residence at `to`, from a Factory or another Residence.
 * `credit` names whose School is credited when the person comes from another city
 * (the owner adds a cube to the bag); null for a pull within the city.
 */
export interface Pull {
  from: HexKey
  color: CubeColor
  to: HexKey
  credit: PlayerColor | null
}

export type VotesMove =
  /** Place a tile from your own supply. */
  | { kind: 'place'; tile: PlaceableKind; at: HexKey }
  /** Only legal when no tile in your supply fits. */
  | { kind: 'pass' }
  | ({ kind: 'pull' } & Pull)
  | { kind: 'endTurn' }
