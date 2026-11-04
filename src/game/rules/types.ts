import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'

/**
 * Seat order: seat 0 is pink, seat 1 vermillion, and so on. These are the ids kept in
 * the game state; the names players see (Orchid, Cobalt, ...) live in ui/pieceColors.ts.
 */
export const PLAYER_COLORS = ['pink', 'vermillion', 'blue', 'yellow', 'green'] as const

export type PlayerColor = (typeof PLAYER_COLORS)[number]

/** Grey cubes are independents: people no player brought in. Those not seeded at setup go in the bag. */
export const INDEPENDENT = 'grey' as const

/** A cube is a person. */
export type CubeColor = PlayerColor | typeof INDEPENDENT

export type PlayerCount = 3 | 4 | 5

export const MIN_PLAYERS: PlayerCount = 3
export const MAX_PLAYERS: PlayerCount = 5

/** People seeded on each starting Residence at setup. */
export const STARTING_PEOPLE_PER_RESIDENCE = 2
/** Cubes of each player's colour among the people seeded at setup. */
export const STARTING_PEOPLE_PER_PLAYER = 2

export type TileKind = 'residence' | 'factory' | 'mine' | 'school'

/** Players place every kind of tile; the starting Residences and printed Factories are on the map from the start. */
export type PlaceableKind = TileKind

/** Tiles that bring people from the bag and are worth points at elections. */
export type IndustryKind = 'factory' | 'mine'

/** The [bracketed] playtest dials from the rules. */
export interface VotesSettings {
  /** Cubes of each player's colour in the bag at setup. */
  startingCubesPerPlayer: number
  /** Grey cubes in the game: the ones not seeded on the starting Residences go in the bag. */
  greyCubes: number
  /** People a new Factory or Mine draws from the bag into its city. */
  arrivals: Record<IndustryKind, number>
  /** Tiles of each kind in the supply at setup. */
  tileCounts: Record<PlaceableKind, number>
}

/** A Residence has no capacity: people keep moving in while the rules send them. */
export interface ResidenceTile {
  kind: 'residence'
  /** People living here, in the order they moved in. */
  people: CubeColor[]
}

export interface BuildingTile {
  kind: 'factory' | 'mine' | 'school'
}

/** Tiles belong to nobody. */
export type Tile = ResidenceTile | BuildingTile

export interface PlayerState {
  color: PlayerColor
  score: number
}

export type Phase =
  | { kind: 'placement' }
  /**
   * A new Factory or Mine drew `person` from the bag, and these Residences of its city
   * tie for least crowded: the player picks one. `remaining` more are drawn afterwards.
   */
  | { kind: 'arrival'; person: CubeColor; residences: HexKey[]; remaining: number }
  /** Levelling and School pulls, until nobody can move; the player breaks ties. */
  | { kind: 'movement' }
  | { kind: 'gameOver'; winners: PlayerColor[] }

export interface TurnState {
  number: number
  /** Index into {@link VotesState.players}. */
  playerIndex: number
  /** Where this turn's tile went; null before placing, or after a pass. */
  placedAt: HexKey | null
}

/** A merger marker on the edge where two cities joined. */
export interface MergerMarker {
  number: number
  between: [HexKey, HexKey]
}

/** Levelling within a city, or a School city pulling from a city without one. */
export type MoveReason = 'levelling' | 'schoolPull'

/** Why a Residence's seat went where it did: the most people, the leftmost of a tie, or nobody's when empty. */
export type SeatReason = 'mostPeople' | 'leftmostOfTie' | 'empty'

/** Every Residence is a seat. */
export interface SeatResult {
  residence: HexKey
  /** Who lived there when the city voted. */
  people: CubeColor[]
  /** Null only for an empty Residence. */
  winner: CubeColor | null
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
  /** The city's Factories and Mines added up. */
  cityValue: number
  /** From the payout table, by the city's value and its number of seats. */
  pointsPerSeat: number
  /** Points for each player holding a seat: the points per seat for every one. */
  scores: Partial<Record<PlayerColor, number>>
}

export type LogEntry =
  | { kind: 'placed'; turn: number; player: PlayerColor; tile: PlaceableKind; at: HexKey }
  | { kind: 'passed'; turn: number; player: PlayerColor }
  /** A person drawn from the bag into a Residence; the voter added 1 cube to the bag. */
  | { kind: 'arrived'; turn: number; color: CubeColor; residence: HexKey; voter: PlayerColor }
  /** A person moved between Residences; the voter added 1 cube to the bag. */
  | { kind: 'moved'; turn: number; color: CubeColor; from: HexKey; to: HexKey; voter: PlayerColor; reason: MoveReason }
  | { kind: 'merger'; turn: number; city: TownId[]; electionNumber: number }
  | { kind: 'gameOver'; turn: number; winners: PlayerColor[]; reason: 'lastMerger' | 'nobodyCanBuild' }

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
 * Residence, levelling and School pulls).
 */
export const RULES_VERSION = 13

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
  arrivals: Record<IndustryKind, number>
  /** Tiles left to place, by kind. */
  supply: Record<PlaceableKind, number>
  /** Turns in a row that ended without a tile being placed. */
  consecutivePasses: number
  elections: ElectionResult[]
  log: LogEntry[]
}

/** One person moved from one Residence into another. */
export interface PersonMove {
  from: HexKey
  color: CubeColor
  to: HexKey
}

export type VotesMove =
  | { kind: 'place'; tile: PlaceableKind; at: HexKey }
  /** Only legal when no tile can be placed anywhere. */
  | { kind: 'pass' }
  /** The person a Factory or Mine just drew goes into this Residence, one of those tied for least crowded. */
  | { kind: 'arrive'; residence: HexKey }
  /** Levelling or a School pull: `to` is one of the moves the rules allow now. */
  | ({ kind: 'move' } & PersonMove)
