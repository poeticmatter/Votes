import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'

/**
 * Seat order: seat 0 is pink, seat 1 vermillion, and so on. These are the ids kept in
 * the game state; the names players see (Orchid, Cobalt, ...) live in ui/pieceColors.ts.
 */
export const PLAYER_COLORS = ['pink', 'vermillion', 'blue', 'yellow', 'green'] as const

export type PlayerColor = (typeof PLAYER_COLORS)[number]

/** Grey cubes are independents: people no player brought in. They only exist at setup. */
export const INDEPENDENT = 'grey' as const

/** A cube is a person. */
export type CubeColor = PlayerColor | typeof INDEPENDENT

export type PlayerCount = 2 | 3 | 4 | 5

export const MIN_PLAYERS: PlayerCount = 2
export const MAX_PLAYERS: PlayerCount = 5

/** A Residence holding this many people is full, though a School can push more in. */
export const RESIDENCE_CAPACITY = 3
/** People seeded on each starting Residence at setup. */
export const STARTING_PEOPLE_PER_RESIDENCE = 2
/** Cubes of each player's colour among the people seeded at setup. */
export const STARTING_PEOPLE_PER_PLAYER = 2

/** The [bracketed] playtest dials from the rules. */
export interface VotesSettings {
  /** Cubes of each player's colour in the bag at setup. */
  startingCubesPerPlayer: number
  /** People a new Factory draws onto a Station in its city. */
  factoryArrivals: number
}

export type TileKind = 'residence' | 'station' | 'factory' | 'school'

/** Stations are printed on the map; players place the rest. */
export type PlaceableKind = Exclude<TileKind, 'station'>

export interface ResidenceTile {
  kind: 'residence'
  /** People living here, in the order they moved in. */
  people: CubeColor[]
}

export interface StationTile {
  kind: 'station'
  /** People who arrived here and are waiting to be housed. */
  people: CubeColor[]
}

export interface BuildingTile {
  kind: 'factory' | 'school'
}

/** Tiles belong to nobody. */
export type Tile = ResidenceTile | StationTile | BuildingTile

export interface PlayerState {
  color: PlayerColor
  score: number
}

export type Phase =
  | { kind: 'placement' }
  /** A new School's relocation: the one move it owes, into one of these Residences. */
  | { kind: 'relocation'; residences: HexKey[] }
  /** A new Factory's people arrive at one of these Stations, the player's choice. */
  | { kind: 'immigration'; stations: HexKey[] }
  /** People waiting at Stations move into Residences with space. */
  | { kind: 'housing' }
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
  factoryPoints: number
  /** Players who scored the city's Factories; empty when grey leads or nobody has a seat. */
  scorers: PlayerColor[]
}

export type LogEntry =
  | { kind: 'placed'; turn: number; player: PlayerColor; tile: PlaceableKind; at: HexKey }
  | { kind: 'passed'; turn: number; player: PlayerColor }
  /** A School's relocation; `votes` cubes of the voter's went into the bag, none for a person from a neighboring city. */
  | { kind: 'relocated'; turn: number; color: CubeColor; from: HexKey; to: HexKey; voter: PlayerColor; votes: number }
  /** People drawn from the bag onto a Station. */
  | { kind: 'arrived'; turn: number; station: HexKey; people: CubeColor[] }
  | {
      kind: 'housed'
      turn: number
      color: CubeColor
      from: HexKey
      to: HexKey
      voter: PlayerColor
      /** The Station was in a neighboring city. */
      isFromNeighbor: boolean
      /** Cubes the voter added to the bag: 1, or 0 for a person from a neighboring city. */
      votes: number
    }
  | { kind: 'merger'; turn: number; city: TownId[]; electionNumber: number }
  | { kind: 'gameOver'; turn: number; winners: PlayerColor[]; reason: 'lastMerger' | 'nobodyCanBuild' }

/**
 * Bump this whenever the rules or the saved state's shape change, so a game saved by
 * another version (an async room, or a browser still running an older deploy) is
 * recognised instead of misread. 2 is Draft 5.4, 3 Draft 5.7 with town colours, 4 the
 * same on the mountains-only map, 5 the first Draft 5.8, 6 Draft 5.8 with neighboring
 * cities and ties going left.
 */
export const RULES_VERSION = 6

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
  factoryArrivals: number
  /** Turns in a row that ended without a tile being placed. */
  consecutivePasses: number
  elections: ElectionResult[]
  log: LogEntry[]
}

/** One person moved from a Residence or Station into a Residence. */
export interface PersonMove {
  from: HexKey
  color: CubeColor
  to: HexKey
}

export type VotesMove =
  | { kind: 'place'; tile: PlaceableKind; at: HexKey }
  /** Only legal when no tile can be placed anywhere. */
  | { kind: 'pass' }
  /** A School's relocation: `to` is one of the Residences it may fill. */
  | ({ kind: 'relocate' } & PersonMove)
  /** A Factory's people arrive at this Station of its city. */
  | { kind: 'arrive'; station: HexKey }
  /** Houses a person waiting at Station `from` in Residence `to`. */
  | ({ kind: 'house' } & PersonMove)
