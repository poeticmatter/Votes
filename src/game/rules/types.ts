import type { HexKey } from '../map/hexGrid'
import type { DistrictId } from '../map/mapData'

/**
 * Seat order: seat 0 is pink, seat 1 vermillion, and so on. These are the ids kept in
 * the game state; the names players see (Orchid, Cobalt, ...) live in ui/pieceColors.ts.
 */
export const PLAYER_COLORS = ['pink', 'vermillion', 'blue', 'yellow', 'green'] as const

export type PlayerColor = (typeof PLAYER_COLORS)[number]

/** Grey cubes are independents: people no player brought in. */
export const INDEPENDENT = 'grey' as const

/** A cube is a person. */
export type CubeColor = PlayerColor | typeof INDEPENDENT

export type PlayerCount = 2 | 3 | 4 | 5

export const MIN_PLAYERS: PlayerCount = 2
export const MAX_PLAYERS: PlayerCount = 5

/** A Residence holding this many people is full, though a School can push more in. */
export const RESIDENCE_CAPACITY = 3
export const STATIONS_BY_PLAYER_COUNT: Record<PlayerCount, number> = { 2: 3, 3: 2, 4: 2, 5: 2 }
/** People seeded on each printed Residence at setup. */
export const STARTING_PEOPLE_PER_RESIDENCE = 2
/** Cubes of each player's colour among the people seeded at setup. */
export const STARTING_PEOPLE_PER_PLAYER = 2

/** People drawn from the bag when a tile's immigration runs. */
export interface Arrivals {
  /** At a Station when it's built. */
  perStation: number
  /** At each Station in a Factory's district when the Factory is built. */
  perFactory: number
}

/** The [bracketed] playtest dials from the rules. */
export interface VotesSettings {
  /** Residences each player starts with, by player count. */
  residencesByPlayerCount: Record<PlayerCount, number>
  /** Grey cubes at setup: those seeded on the printed Residences, the rest in the bag. */
  greyCubes: number
  /** Cubes of each player's colour in the bag at setup. */
  startingCubesPerPlayer: number
  arrivals: Arrivals
}

export type TileKind = 'residence' | 'station' | 'factory' | 'school'

/** A Residence with no owner is one of the five printed on the map. */
export interface ResidenceTile {
  kind: 'residence'
  owner: PlayerColor | null
  /** People living here, in the order they moved in. */
  people: CubeColor[]
}

export interface StationTile {
  kind: 'station'
  owner: PlayerColor
  /** People who arrived here and are waiting to be housed. */
  people: CubeColor[]
}

export interface PublicTile {
  kind: 'factory' | 'school'
}

export type Tile = ResidenceTile | StationTile | PublicTile

export interface PlayerState {
  color: PlayerColor
  score: number
  residencesLeft: number
  stationsLeft: number
}

export type Phase =
  | { kind: 'placement' }
  /** A new School's relocation: the Residences next to it still owed a person. */
  | { kind: 'relocation'; residences: HexKey[] }
  /** People waiting at Stations move into Residences with space in their city. */
  | { kind: 'housing' }
  | { kind: 'gameOver'; winners: PlayerColor[] }

export interface TurnState {
  number: number
  /** Index into {@link VotesState.players}. */
  playerIndex: number
  /** Where this turn's tile went; null before placing, or after a pass. */
  placedAt: HexKey | null
}

/** A merger marker on the district line where two cities joined. */
export interface MergerMarker {
  number: number
  between: [HexKey, HexKey]
}

/** Why a Residence's seat went where it did. */
export type SeatReason = 'mostPeople' | 'tieToOwner' | 'tieToGrey'

/** Every Residence is a seat. */
export interface SeatResult {
  residence: HexKey
  owner: PlayerColor | null
  winner: CubeColor
  reason: SeatReason
}

/** The vote in one city, newly merged or (for a preview) as it stands. */
export interface ElectionResult {
  number: number
  turn: number
  city: DistrictId[]
  seats: SeatResult[]
  seatsByColor: Partial<Record<CubeColor, number>>
  factoryPoints: number
  /** Players who scored the city's Factories; empty when grey leads or nobody has a seat. */
  scorers: PlayerColor[]
}

export type LogEntry =
  | { kind: 'placed'; turn: number; player: PlayerColor; tile: TileKind; at: HexKey }
  | { kind: 'passed'; turn: number; player: PlayerColor }
  | { kind: 'relocated'; turn: number; color: CubeColor; from: HexKey; to: HexKey }
  /** People drawn for a Station; its owner added as many of their cubes to the bag. */
  | { kind: 'arrived'; turn: number; station: HexKey; owner: PlayerColor; people: CubeColor[] }
  | {
      kind: 'housed'
      turn: number
      color: CubeColor
      from: HexKey
      to: HexKey
      /** The Residence's owner, when they added a cube to the bag for this person. */
      paid: PlayerColor | null
    }
  | { kind: 'merger'; turn: number; city: DistrictId[]; electionNumber: number }
  | { kind: 'gameOver'; turn: number; winners: PlayerColor[]; reason: 'lastMerger' | 'nobodyCanBuild' }

export interface VotesState {
  /** In seat order. */
  players: PlayerState[]
  firstPlayerIndex: number
  turn: TurnState
  phase: Phase
  tiles: Record<HexKey, Tile>
  /** Each city is the sorted list of its districts. */
  cities: DistrictId[][]
  mergers: MergerMarker[]
  bag: Partial<Record<CubeColor, number>>
  /** Seeded generator state, so every client draws the same cubes. */
  randomState: number
  arrivals: Arrivals
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
  | { kind: 'place'; tile: TileKind; at: HexKey }
  /** Only legal when the active player has no tile they can place anywhere. */
  | { kind: 'pass' }
  /** A School's relocation: `to` is one of the Residences next to it. */
  | ({ kind: 'relocate' } & PersonMove)
  /** Houses a person waiting at Station `from` in Residence `to`. */
  | ({ kind: 'house' } & PersonMove)
