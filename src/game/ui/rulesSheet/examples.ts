import { residenceSiteKey, stationKeyOf, TOWN_IDS } from '../../map/board'
import { hexKey, type HexKey } from '../../map/hexGrid'
import { STARTING_FACTORIES, type TownId } from '../../map/mapData'
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
const building = (kind: 'factory' | 'mine' | 'school'): Tile => ({ kind })
const waitingAt = (people: CubeColor[]): Tile => ({ kind: 'station', people })

/**
 * Every town's starting Residence and Station and the printed Factories, with
 * `startingPeople` on the Residences and `waiting` at the Stations, under the example's own tiles.
 */
function examplePosition(
  frame: Omit<ExamplePosition, 'tiles'>,
  startingPeople: Partial<Record<TownId, CubeColor[]>>,
  tiles: Record<HexKey, Tile>,
  waiting: Partial<Record<TownId, CubeColor[]>> = {},
): ExamplePosition {
  const towns = TOWN_IDS.flatMap((town): [HexKey, Tile][] => [
    [residenceSiteKey(town), residence(startingPeople[town] ?? [])],
    [stationKeyOf(town), waitingAt(waiting[town] ?? [])],
  ])
  const printed = STARTING_FACTORIES.map(([col, row]): [HexKey, Tile] => [hexKey(col, row), building('factory')])
  return { ...frame, tiles: { ...Object.fromEntries([...towns, ...printed]), ...tiles } }
}

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
  intro: 'Cobalt is choosing where to build around town B, in the east.',
  position: examplePosition({ playerCount: 3, columns: [7, 10], rows: [1, 4] }, { B: ['pink', 'blue'] }, {}),
  candidates: [
    {
      number: 1,
      at: '9,3',
      kind: 'residence',
      isAllowed: true,
      reason: 'It touches B’s Residence.',
    },
    {
      number: 2,
      at: '10,1',
      kind: 'factory',
      isAllowed: true,
      reason: 'It touches B’s Residence and its Station. A Station counts as a tile.',
    },
    {
      number: 3,
      at: '9,1',
      kind: 'school',
      isAllowed: false,
      reason: 'It touches B’s Residence, but only Mines go on mountains.',
    },
    {
      number: 4,
      at: '8,2',
      kind: 'mine',
      isAllowed: true,
      reason: 'Mines go only on mountains, and this one touches B’s Residence.',
    },
    {
      number: 5,
      at: '7,3',
      kind: 'residence',
      isAllowed: false,
      reason: 'It touches no tile or Station.',
    },
  ] satisfies PlacementCandidate[],
}

// Town A during Saffron's turn: after immigration, then after housing.
const A_FRAME: Omit<ExamplePosition, 'tiles'> = { playerCount: 3, columns: [7, 10], rows: [5, 8] }
const A_FACTORY = '8,6'
const A_STATION = stationKeyOf('A')
const A_STARTING_RESIDENCE = residenceSiteKey('A')
const A_SECOND_RESIDENCE = '9,7'

export const IMMIGRATION_EXAMPLE = {
  position: examplePosition(
    A_FRAME,
    { A: ['grey', 'pink'] },
    { [A_FACTORY]: building('factory'), [A_SECOND_RESIDENCE]: residence(['blue', 'pink']) },
    { A: ['yellow', 'blue', 'pink'] },
  ),
  placed: A_FACTORY,
  caption: [
    'Saffron builds a Factory touching A’s Station. It borders the rail but touches no Mine, so it’s worth 2 at elections.',
    'Immigration: 3 people arrive at a Station in the Factory’s city. A has only one Station, so they go there. They are drawn from the bag: a Saffron, a Cobalt and an Orchid.',
    'A city with several Stations lets Saffron choose which one gets them.',
  ],
}

// After housing: A had room for 2, so 1 person is still waiting.
export const HOUSING_EXAMPLE = {
  position: examplePosition(
    A_FRAME,
    { A: ['grey', 'pink', 'pink'] },
    { [A_FACTORY]: building('factory'), [A_SECOND_RESIDENCE]: residence(['blue', 'pink', 'yellow']) },
    { A: ['blue'] },
  ),
  moves: [
    { from: A_STATION, to: A_SECOND_RESIDENCE, home: 2 },
    { from: A_STATION, to: A_STARTING_RESIDENCE, home: 2 },
  ] satisfies PersonArrow[],
  bagTags: [{ at: A_SECOND_RESIDENCE, color: 'yellow', amount: 2, side: 'below' }] satisfies BagTag[],
  caption: [
    'Then housing. People move only within their own city, and A has room for 2: one place in each Residence.',
    'Saffron, the active player, picks who moves in. The Saffron person goes to the Residence on the right and the Orchid one to A’s starting Residence, each joining on the right. The Cobalt person keeps waiting.',
    'Votes: 2 people moved into Residences, so Saffron adds 2 Saffron cubes to the bag.',
  ],
}

const C_SCHOOL = '7,1'
/** Beside the existing School, so nobody can move into it. */
const C_BLOCKED = '6,1'
const C_FULL = '7,2'
/** Touches no School and doesn't border the rail, so the School may take from it. */
const C_SOURCE = '7,3'

// Cobalt's person lived at C_SOURCE, beside the Orchid one, until the School moved them.
export const SCHOOL_EXAMPLE = {
  position: examplePosition(
    { playerCount: 3, columns: [5, 8], rows: [0, 3] },
    { C: ['grey', 'yellow'] },
    {
      [C_BLOCKED]: residence(['pink', 'yellow', 'grey']),
      [C_FULL]: residence(['yellow', 'blue', 'grey', 'blue']),
      [C_SOURCE]: residence(['pink']),
      '5,1': building('school'),
      [C_SCHOOL]: building('school'),
    },
  ),
  placed: C_SCHOOL,
  blocked: C_BLOCKED,
  moves: [{ from: C_SOURCE, to: C_FULL, home: 3 }] satisfies PersonArrow[],
  bagTags: [{ at: '8,3', color: 'blue', amount: 1, side: 'above' }] satisfies BagTag[],
  caption: [
    'Cobalt builds a School in C. Three Residences touch it, but the one on the left also touches another School, so nobody can move into it.',
    'Relocation: Cobalt moves 1 person into one of the other two, even a full one. They must come from a Residence that touches no School and doesn’t border the rail, so not from C’s starting Residence.',
    'Cobalt takes the Cobalt person from the bottom Residence; the Orchid one slides left. The Cobalt person joins the full Residence on its right, and Cobalt now has the most people there.',
    'Votes: a person moved into a Residence, so Cobalt adds 1 Cobalt cube to the bag.',
  ],
}

const MERGER_PLACED = '8,3'

// C's tiles reach down to [7, 2] and B's Residence is at [9, 2]; the new Residence at
// [8, 3] touches both. The Mine touches only C's tiles.
export const MERGER_EXAMPLE = {
  position: examplePosition(
    { playerCount: 3, columns: [7, 10], rows: [0, 4] },
    { C: ['pink', 'blue', 'blue'], B: ['blue', 'blue', 'pink'] },
    {
      '7,1': building('factory'),
      '8,1': building('mine'),
      '9,3': building('factory'),
      '7,2': residence(['yellow', 'blue']),
      [MERGER_PLACED]: residence(),
    },
  ),
  placed: MERGER_PLACED,
  caption: [
    'Saffron builds a Residence that touches both C’s Residence and B’s.',
    'A tile that touches two cities joins them: B and C are one city. Only the new city votes.',
  ],
}

const MERGED_CITY: TownId[] = ['B', 'C']

/** The election that merger triggers, counted by the game. */
function mergerElection(): ElectionResult {
  return countVotes(stateOf(MERGER_EXAMPLE.position), MERGED_CITY)
}

export const ELECTION_EXAMPLE = {
  result: mergerElection(),
  caption: [
    'Each of the new city’s 4 Residences is a seat.',
    'Cobalt wins the starting Residences of both B and C. The Residence next to C’s holds a Saffron and a Cobalt, tied, so the colour furthest left, Saffron, wins it. The new Residence is empty: it belongs to nobody but still counts as one of the 4 seats.',
    'The city is worth 7. C’s Factory borders the rail and touches the Mine, 3; B’s borders the rail, 2; the Mine, 2.',
    'Worth 7 with 4 seats pays 2 points per seat, so Cobalt scores 4 and Saffron 2.',
  ],
}
