import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'

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

/** Tiles come in three town colours and belong to nobody. */
export const TOWN_COLORS = ['sand', 'sage', 'slate'] as const

export type TownColor = (typeof TOWN_COLORS)[number]

/** The starting Residences: two colours shared by two towns each, one with a single town. */
export const STARTING_RESIDENCE_COLORS: readonly TownColor[] = ['sand', 'sand', 'sage', 'sage', 'slate']

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
  /** Grey cubes at setup: those seeded on the starting Residences, the rest in the bag. */
  greyCubes: number
  /** Cubes of each player's colour in the bag at setup. */
  startingCubesPerPlayer: number
  /** People a new Factory draws onto its town's Station. */
  factoryArrivals: number
}

export type TileKind = 'residence' | 'station' | 'factory' | 'school'

/** Stations are printed on the map; players place the rest. */
export type PlaceableKind = Exclude<TileKind, 'station'>

/** Every tile has a town colour and belongs to the town it was built onto. */
interface TownTile {
  color: TownColor
  town: TownId
}

export interface ResidenceTile extends TownTile {
  kind: 'residence'
  /** People living here, in the order they moved in. */
  people: CubeColor[]
}

export interface StationTile extends TownTile {
  kind: 'station'
  /** People who arrived here and are waiting to be housed. */
  people: CubeColor[]
}

export interface BuildingTile extends TownTile {
  kind: 'factory' | 'school'
}

export type Tile = ResidenceTile | StationTile | BuildingTile

export interface PlayerState {
  color: PlayerColor
  score: number
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

/** A merger marker on the edge where two cities joined. */
export interface MergerMarker {
  number: number
  between: [HexKey, HexKey]
}

/** Why a Residence's seat went where it did. */
export type SeatReason = 'mostPeople' | 'tieToGrey'

/** Every Residence is a seat. */
export interface SeatResult {
  residence: HexKey
  town: TownId
  /** Who lived there when the city voted. */
  people: CubeColor[]
  winner: CubeColor
  reason: SeatReason
}

/** The vote in one city, newly merged or (for a preview) as it stands. */
export interface ElectionResult {
  number: number
  turn: number
  city: TownId[]
  seats: SeatResult[]
  seatsByColor: Partial<Record<CubeColor, number>>
  factoryPoints: number
  /** Players who scored the city's Factories; empty when grey leads or nobody has a seat. */
  scorers: PlayerColor[]
}

export type LogEntry =
  | { kind: 'placed'; turn: number; player: PlayerColor; tile: PlaceableKind; color: TownColor; town: TownId; at: HexKey }
  | { kind: 'passed'; turn: number; player: PlayerColor }
  /** A School's relocation; the active player added a vote to the bag for it. */
  | { kind: 'relocated'; turn: number; color: CubeColor; from: HexKey; to: HexKey; voter: PlayerColor }
  /** Votes a new School earned for the Residences next to it that touch no other School. */
  | { kind: 'schoolVotes'; turn: number; player: PlayerColor; count: number }
  /** People drawn from the bag onto a town's Station. */
  | { kind: 'arrived'; turn: number; station: HexKey; town: TownId; people: CubeColor[] }
  /** Housing; the active player added a vote to the bag for it. */
  | { kind: 'housed'; turn: number; color: CubeColor; from: HexKey; to: HexKey; voter: PlayerColor }
  | { kind: 'merger'; turn: number; city: TownId[]; electionNumber: number }
  | { kind: 'gameOver'; turn: number; winners: PlayerColor[]; reason: 'lastMerger' | 'nobodyCanBuild' }

/**
 * Bump this whenever the rules or the saved state's shape change, so a game saved by
 * another version (an async room, or a browser still running an older deploy) is
 * recognised instead of misread. 2 is Draft 5.4, 3 Draft 5.7.
 */
export const RULES_VERSION = 3

export interface VotesState {
  /** {@link RULES_VERSION} when the game was created; missing in games from before it existed. */
  rulesVersion: number
  /** In seat order. */
  players: PlayerState[]
  firstPlayerIndex: number
  turn: TurnState
  phase: Phase
  tiles: Record<HexKey, Tile>
  /** Each town's colour, dealt at setup. */
  townColors: Record<TownId, TownColor>
  /** Each city is the sorted list of its towns. */
  cities: TownId[][]
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
  | { kind: 'place'; tile: PlaceableKind; color: TownColor; at: HexKey }
  /** Only legal when the active player has no tile they can place anywhere. */
  | { kind: 'pass' }
  /** A School's relocation: `to` is one of the Residences next to it. */
  | ({ kind: 'relocate' } & PersonMove)
  /** Houses a person waiting at Station `from` in Residence `to`. */
  | ({ kind: 'house' } & PersonMove)
