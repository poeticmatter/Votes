import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'

/**
 * Seat order: seat 0 is pink, seat 1 vermillion, and so on. These are the ids kept in
 * the game state; the names players see (Orchid, Cobalt, ...) live in ui/pieceColors.ts.
 */
export const PLAYER_COLORS = ['pink', 'vermillion', 'blue', 'yellow', 'green'] as const

export type PlayerColor = (typeof PLAYER_COLORS)[number]

/**
 * Grey cubes are independents: people no player brought in, who never vote. Those not
 * seeded at setup go in the bag.
 */
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

/** A Residence with this many people or more is overcrowded. */
export const OVERCROWDED_AT = 4
/** Residence tiles each player starts the game with in their own supply. */
export const STARTING_RESIDENCES_PER_PLAYER = 2
/** Residence tiles a player takes into their supply for placing a Factory. */
export const RESIDENCES_PER_FACTORY = 2

export type TileKind = 'residence' | 'factory' | 'school'

/** Players place every kind of tile; the starting Residences and printed Factories are on the map from the start. */
export type PlaceableKind = TileKind

/** Tiles a player may take from the shared supply as their action. Residences come only with Factories and at setup. */
export type TakeableKind = 'factory' | 'school'

export const TAKEABLE_KINDS: readonly TakeableKind[] = ['factory', 'school']

/** The [bracketed] playtest dials from the rules. */
export interface VotesSettings {
  /** Cubes of each player's colour in the bag at setup. */
  startingCubesPerPlayer: number
  /** Grey cubes in the game: the ones not seeded on the starting Residences go in the bag. */
  greyCubes: number
  /** Tiles of each kind in the shared supply at setup, before players take their starting Residences. */
  tileCounts: Record<PlaceableKind, number>
}

/**
 * A Residence has no capacity: people keep moving in while the rules send them. A
 * face-down one is a promise: it joins its city but is no seat and holds nobody until
 * someone flips it.
 */
export interface ResidenceTile {
  kind: 'residence'
  isFaceDown: boolean
  /** People living here, in the order they moved in. */
  people: CubeColor[]
}

/** A face-down Factory is a promise: it joins its city but brings nobody and scores nothing until flipped. */
export interface FactoryTile {
  kind: 'factory'
  isFaceDown: boolean
}

/** Schools are placed face up; one flipped over is a University. */
export interface SchoolTile {
  kind: 'school'
  isUniversity: boolean
}

/** Tiles belong to nobody, once placed. */
export type Tile = ResidenceTile | FactoryTile | SchoolTile

export interface PlayerState {
  color: PlayerColor
  score: number
  /** Tiles in the player's own supply, waiting to be placed. */
  supply: Record<PlaceableKind, number>
}

export type Phase =
  | { kind: 'action' }
  /**
   * A flipped Factory drew `person` from the bag for one city, and these of its
   * Residences tie for least crowded: the player picks one. Then one more person is
   * drawn for each city in `remainingCities`, named by their first town.
   */
  | { kind: 'arrival'; person: CubeColor; residences: HexKey[]; remainingCities: TownId[] }
  /** Levelling, then School pulls, until nobody can move; the player breaks ties. */
  | { kind: 'movement' }
  | { kind: 'gameOver'; winners: PlayerColor[] }

export interface TurnState {
  number: number
  /** Index into {@link VotesState.players}. */
  playerIndex: number
  /** Where this turn's tile went; null if the turn's action wasn't a placement. */
  placedAt: HexKey | null
}

/** A merger marker on the edge where two cities joined. */
export interface MergerMarker {
  number: number
  between: [HexKey, HexKey]
}

/** Levelling within a city, or a School or University city pulling from a city that ranks below it. */
export type MoveReason = 'levelling' | 'schoolPull'

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
  /** Each seat scores its holder 1 point per face-up Factory in the city. */
  pointsPerSeat: number
  /** Points for each player holding a seat: the points per seat for every one. */
  scores: Partial<Record<PlayerColor, number>>
}

/** What a flip turned a tile into. */
export type FlippedInto = 'residence' | 'factory' | 'university'

export type LogEntry =
  | { kind: 'took'; turn: number; player: PlayerColor; tile: TakeableKind }
  | { kind: 'placed'; turn: number; player: PlayerColor; tile: PlaceableKind; at: HexKey }
  /** A face-down Residence's promise: `votes` of the player's cubes went into the bag, one per overcrowded Residence in its city. */
  | { kind: 'promised'; turn: number; player: PlayerColor; votes: number }
  /** A Factory placed face down earned the player `count` Residence tiles from the shared supply. */
  | { kind: 'gotResidences'; turn: number; player: PlayerColor; count: number }
  | { kind: 'flipped'; turn: number; player: PlayerColor; at: HexKey; into: FlippedInto }
  | { kind: 'passed'; turn: number; player: PlayerColor }
  /** A person drawn from the bag into a Residence; the voter added 1 cube to the bag. */
  | { kind: 'arrived'; turn: number; color: CubeColor; residence: HexKey; voter: PlayerColor }
  /** A person moved between Residences. Moving adds nothing to the bag. */
  | { kind: 'moved'; turn: number; color: CubeColor; from: HexKey; to: HexKey; reason: MoveReason }
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
 * payout table).
 */
export const RULES_VERSION = 15

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
  /** The shared supply: tiles nobody has taken yet, by kind. */
  supply: Record<PlaceableKind, number>
  /** Turns in a row that ended in a pass. */
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
  /** Action: take a tile from the shared supply into your own. */
  | { kind: 'take'; tile: TakeableKind }
  /** Action: place a tile from your own supply. */
  | { kind: 'place'; tile: PlaceableKind; at: HexKey }
  /** Action: flip a face-down tile, or a School into a University. */
  | { kind: 'flip'; at: HexKey }
  /** Only legal when no action is possible. */
  | { kind: 'pass' }
  /** The person a flipped Factory just drew goes into this Residence, one of those tied for least crowded. */
  | { kind: 'arrive'; residence: HexKey }
  /** Levelling or a School pull: `to` is one of the moves the rules allow now. */
  | ({ kind: 'move' } & PersonMove)
