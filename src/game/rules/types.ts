import type { HexKey } from '../map/hexGrid'
import type { DistrictId } from '../map/mapData'

/**
 * Seat order: seat 0 is pink, seat 1 vermillion, and so on. These are the ids kept in
 * the game state; the names players see (Orchid, Cobalt, ...) live in ui/pieceColors.ts.
 */
export const PLAYER_COLORS = ['pink', 'vermillion', 'blue', 'yellow', 'green'] as const

export type PlayerColor = (typeof PLAYER_COLORS)[number]

/** Grey cubes are independents: families no player brought in. */
export const INDEPENDENT = 'grey' as const

export type CubeColor = PlayerColor | typeof INDEPENDENT

export type PlayerCount = 2 | 3 | 4 | 5

export const MIN_PLAYERS: PlayerCount = 2
export const MAX_PLAYERS: PlayerCount = 5

export const HOMES_PER_RESIDENCE = 3
export const JOBS_PER_FACTORY = 5
export const STATIONS_PER_PLAYER = 3
/** Families seeded on each printed Residence at setup. */
export const STARTING_FAMILIES_PER_RESIDENCE = 2
/** Cubes of each player's colour among the families seeded at setup. */
export const STARTING_FAMILIES_PER_PLAYER = 2

/** The [bracketed] playtest dials from the rules. */
export interface VotesSettings {
  /** Residences each player starts with, by player count. */
  residencesByPlayerCount: Record<PlayerCount, number>
  /** Grey cubes at setup: those seeded on the printed Residences, the rest in the bag. */
  greyCubes: number
  /** Cubes of each player's colour in the bag at setup. */
  startingCubesPerPlayer: number
}

export type TileKind = 'residence' | 'station' | 'factory' | 'school'

/** A Residence with no owner is one of the five printed on the map. */
export interface ResidenceTile {
  kind: 'residence'
  owner: PlayerColor | null
  /** Families living here, in the order they arrived. */
  families: CubeColor[]
}

export interface StationTile {
  kind: 'station'
  owner: PlayerColor
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

export interface DrawnFamily {
  /** The Station bringing this family. */
  station: HexKey
  color: CubeColor
}

export type Phase =
  | { kind: 'placement' }
  | {
      kind: 'immigration'
      /** Districts families have entered this turn; their Station owners have been paid. */
      districtsEntered: DistrictId[]
      /** A family drawn from the bag that the active player must now house. */
      drawn: DrawnFamily | null
    }
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

export type SeatReason = 'mostCubes' | 'didNotTakeLastSeat' | 'compromise' | 'playerOrder'

export interface SeatAward {
  color: CubeColor
  reason: SeatReason
}

export interface DistrictElection {
  district: DistrictId
  /** One seat per Residence in the district, whether or not anyone there votes. */
  seatCount: number
  /** Families in the district's Residences next to a School, by colour: the only ones who vote. */
  voters: Partial<Record<CubeColor, number>>
  /** One entry per filled seat, in award order. Seats nobody can fill stay empty. */
  awards: SeatAward[]
}

export interface CityElection {
  districts: DistrictId[]
  seats: Partial<Record<CubeColor, number>>
  factoryPoints: number
  /** Players who scored the city's Factories; empty when grey leads or nobody has a seat. */
  scorers: PlayerColor[]
}

export interface ElectionResult {
  number: number
  turn: number
  districts: DistrictElection[]
  cities: CityElection[]
}

export type LogEntry =
  | { kind: 'placed'; turn: number; player: PlayerColor; tile: TileKind; at: HexKey }
  | { kind: 'passed'; turn: number; player: PlayerColor }
  | {
      kind: 'family'
      turn: number
      color: CubeColor
      station: HexKey
      residence: HexKey
      /** Cubes added to the bag because this family arrived; a player may appear twice. */
      addedToBag: PlayerColor[]
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
  /** Turns in a row that ended without a tile being placed. */
  consecutivePasses: number
  elections: ElectionResult[]
  log: LogEntry[]
}

export type VotesMove =
  | { kind: 'place'; tile: TileKind; at: HexKey }
  /** Only legal when the active player has no tile they can place anywhere. */
  | { kind: 'pass' }
  /** Draws a family from the bag for this Station. */
  | { kind: 'callStation'; station: HexKey }
  /** Houses the drawn family in a Residence in the Station's district. */
  | { kind: 'settleFamily'; residence: HexKey }
