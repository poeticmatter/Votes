import { residenceSiteKey, stationKeyOf, TOWN_IDS } from '../../map/board'
import type { HexKey } from '../../map/hexGrid'
import type { TownId } from '../../map/mapData'
import { countVotes } from '../../rules/elections'
import { createInitialState, DEFAULT_SETTINGS } from '../../rules/setup'
import type { CubeColor, ElectionResult, PlaceableKind, PlayerColor, PlayerCount, Tile, VotesState } from '../../rules/types'

// Positions for the rules sheet's worked examples, on the real map. examples.test.ts
// checks them against the game's rules, and the election example is counted by the
// game itself.

export interface ExamplePosition {
  playerCount: PlayerCount
  /** The first and last column and row the figure shows. */
  columns: [number, number]
  rows: [number, number]
  tiles: Record<HexKey, Tile>
}

/** Where a "+n cubes to the bag" tag sits: in the gutter above or below its tile. */
export type TagSide = 'above' | 'below'

export interface BagTag {
  at: HexKey
  color: PlayerColor
  amount: number
  side: TagSide
}

/** A person moving from one tile to another; `home` is their place in the destination's people. */
export interface PersonArrow {
  from: HexKey
  to: HexKey
  home: number
}

const residence = (people: CubeColor[] = []): Tile => ({ kind: 'residence', people })
const building = (kind: 'factory' | 'school'): Tile => ({ kind })

/** Every town's starting Residence and Station, with `startingPeople` on the Residences, under the example's own tiles. */
function examplePosition(
  frame: Omit<ExamplePosition, 'tiles'>,
  startingPeople: Partial<Record<TownId, CubeColor[]>>,
  tiles: Record<HexKey, Tile>,
): ExamplePosition {
  const towns = TOWN_IDS.flatMap((town): [HexKey, Tile][] => [
    [residenceSiteKey(town), residence(startingPeople[town] ?? [])],
    [stationKeyOf(town), { kind: 'station', people: [] }],
  ])
  return { ...frame, tiles: { ...Object.fromEntries(towns), ...tiles } }
}

const waitingAt = (people: CubeColor[]): Tile => ({ kind: 'station', people })

/** A game state holding the example's position, for asking the rules about it. */
export function stateOf(position: ExamplePosition): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount: position.playerCount, seed: 0 })
  return { ...state, tiles: position.tiles }
}

export interface PlacementCandidate {
  number: number
  at: HexKey
  kind: PlaceableKind
  isAllowed: boolean
  reason: string
}

export const PLACEMENT_EXAMPLE = {
  intro: 'Cobalt is choosing where to build around town C, in the east.',
  position: examplePosition({ playerCount: 3, columns: [7, 10], rows: [1, 4] }, { C: ['pink', 'blue'] }, {}),
  candidates: [
    {
      number: 1,
      at: '10,2',
      kind: 'residence',
      isAllowed: true,
      reason: 'It touches C’s Residence.',
    },
    {
      number: 2,
      at: '8,3',
      kind: 'factory',
      isAllowed: true,
      reason: 'It touches C’s Residence and its Station. A Station counts as a tile.',
    },
    {
      number: 3,
      at: '9,1',
      kind: 'school',
      isAllowed: false,
      reason: 'It touches C’s Residence, but mountains can’t be built on.',
    },
    {
      number: 4,
      at: '7,3',
      kind: 'residence',
      isAllowed: false,
      reason: 'It touches no tile or Station.',
    },
  ] satisfies PlacementCandidate[],
}

// Town E during Saffron's turn: after immigration, then after housing.
const E_FRAME: Omit<ExamplePosition, 'tiles'> = { playerCount: 3, columns: [7, 10], rows: [5, 7] }
const E_FACTORY = '8,6'
const E_STATION = stationKeyOf('E')

export const IMMIGRATION_EXAMPLE = {
  position: examplePosition(E_FRAME, { E: ['grey', 'pink'] }, {
    [E_STATION]: waitingAt(['yellow', 'blue', 'pink']),
    [E_FACTORY]: building('factory'),
  }),
  placed: E_FACTORY,
  caption: [
    'Saffron builds a Factory touching E’s Station. It borders the rail, so it’s worth 2 points at elections.',
    'Immigration: 3 people arrive at a Station in the Factory’s city. E has only one Station, so they go there. They are drawn from the bag: a Saffron, a Cobalt and an Orchid.',
    'A city with several Stations lets Saffron choose which one gets them.',
  ],
}

const C_STATION = stationKeyOf('C')
const E_NEW_RESIDENCE = '8,6'
const E_RESIDENCE = residenceSiteKey('E')

// After housing: C's Residence is full, so its Station's two people were waiting.
export const HOUSING_EXAMPLE = {
  position: examplePosition({ playerCount: 3, columns: [7, 10], rows: [2, 7] }, { C: ['blue', 'blue', 'pink'], E: ['blue', 'pink', 'grey'] }, {
    [E_NEW_RESIDENCE]: residence(['pink', 'yellow']),
  }),
  moves: [
    { from: E_STATION, to: E_NEW_RESIDENCE, home: 1 },
    { from: C_STATION, to: E_RESIDENCE, home: 1 },
    { from: C_STATION, to: E_RESIDENCE, home: 2 },
  ] satisfies PersonArrow[],
  bagTags: [{ at: E_NEW_RESIDENCE, color: 'yellow', amount: 1, side: 'above' }] satisfies BagTag[],
  caption: [
    'Then housing. Saffron, the active player, picks who moves in. E has room for 3. C is a neighboring city, since their Stations are one stop apart by rail, so people waiting at C’s Station can move into E too.',
    'The Saffron person waiting at E’s Station moves into E’s new Residence, joining on the right. They come from within the city, so Saffron adds 1 cube to the bag.',
    'An Orchid and a grey person move from C’s Station into E’s starting Residence. They come from a neighboring city, so they add no cubes.',
  ],
}

const B_SCHOOL = '5,2'
const B_STATION = stationKeyOf('B')
/** Beside the existing School, so it can't be filled. */
const B_BLOCKED = '4,2'
const B_RIGHT = '6,2'

// Cobalt's person was waiting at B's Station until the School moved them.
export const SCHOOL_EXAMPLE = {
  position: examplePosition({ playerCount: 3, columns: [3, 6], rows: [0, 3] }, { B: ['grey', 'yellow'] }, {
    [B_BLOCKED]: residence(['pink', 'yellow', 'grey']),
    [B_RIGHT]: residence(['yellow', 'grey', 'grey', 'blue']),
    '3,2': building('school'),
    [B_SCHOOL]: building('school'),
  }),
  placed: B_SCHOOL,
  blocked: B_BLOCKED,
  moves: [{ from: B_STATION, to: B_RIGHT, home: 3 }] satisfies PersonArrow[],
  bagTags: [{ at: B_RIGHT, color: 'blue', amount: 1, side: 'below' }] satisfies BagTag[],
  caption: [
    'Cobalt builds a School in B. Three Residences touch it, but the one on the left also touches another School, so it can’t be filled.',
    'Relocation: Cobalt moves 1 person into one of the other two, even a full one. The Cobalt person waiting at B’s Station goes into the full Residence on the right, joining on its right.',
    'Votes: the person came from within the same city, so Cobalt adds 1 Cobalt cube to the bag.',
  ],
}

const MERGER_PLACED = '9,5'
/** The edge between the new Residence and C's Factory. */
const MERGER_LINE: [HexKey, HexKey] = [MERGER_PLACED, '9,4']

// C's tiles reach down to [9, 4] and E's up to [8, 6]; the new Residence at [9, 5] touches both.
export const MERGER_EXAMPLE = {
  position: examplePosition(
    { playerCount: 3, columns: [7, 10], rows: [2, 7] },
    { C: ['pink', 'blue', 'blue'], E: ['blue', 'blue', 'pink'] },
    {
      '9,4': building('factory'),
      '7,5': building('factory'),
      '8,6': residence(['yellow', 'blue']),
      [MERGER_PLACED]: residence(),
    },
  ),
  placed: MERGER_PLACED,
  marker: { number: 1, between: MERGER_LINE },
  caption: [
    'Saffron builds a Residence that touches both C’s Factory and E’s Residence.',
    'A tile that touches two cities joins them: C and E are one city. Merger marker 1 goes on the edge between the new tile and C’s Factory, and only the new city votes.',
  ],
}

const MERGED_CITY: TownId[] = ['C', 'E']

/** The election that merger triggers, counted by the game. */
function mergerElection(): ElectionResult {
  return countVotes(stateOf(MERGER_EXAMPLE.position), MERGED_CITY)
}

export const ELECTION_EXAMPLE = {
  result: mergerElection(),
  caption: [
    'Each of the new city’s 4 Residences is a seat.',
    'Cobalt wins the starting Residences of both E and C. The Residence between them holds a Saffron and a Cobalt, tied, so the colour furthest left, Saffron, wins it. The new Residence is empty, so it counts for nobody.',
    'Cobalt has the most seats, 2, and scores the city’s Factories: both border the rail, so 4 points.',
  ],
}
