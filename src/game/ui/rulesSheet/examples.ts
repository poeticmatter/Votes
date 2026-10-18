import { residenceSiteKey, stationKeyOf, TOWN_IDS } from '../../map/board'
import type { HexKey } from '../../map/hexGrid'
import type { TownId } from '../../map/mapData'
import { countVotes } from '../../rules/elections'
import { createInitialState, DEFAULT_SETTINGS } from '../../rules/setup'
import type { CubeColor, ElectionResult, PlaceableKind, PlayerColor, PlayerCount, Tile, TownColor, VotesState } from '../../rules/types'

// Positions for the rules sheet's worked examples, on the real map. examples.test.ts
// checks them against the game's rules, and the election example is counted by the
// game itself. Every example deals the town colours the same way.

/** A and D are Sand, B and E Sage, C Slate. */
export const EXAMPLE_TOWN_COLORS: Record<TownId, TownColor> = { A: 'sand', B: 'sage', C: 'slate', D: 'sand', E: 'sage' }

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

/** A person moving between neighbouring tiles; `home` is their place in the destination's people. */
export interface PersonArrow {
  from: HexKey
  to: HexKey
  home: number
}

const colorOf = (town: TownId) => EXAMPLE_TOWN_COLORS[town]
const residence = (town: TownId, people: CubeColor[] = []): Tile => ({ kind: 'residence', color: colorOf(town), town, people })
const station = (town: TownId, people: CubeColor[] = []): Tile => ({ kind: 'station', color: colorOf(town), town, people })
const building = (kind: 'factory' | 'school', town: TownId): Tile => ({ kind, color: colorOf(town), town })

/** Every town's starting Residence and Station, with `startingPeople` on the Residences, under the example's own tiles. */
function examplePosition(
  frame: Omit<ExamplePosition, 'tiles'>,
  startingPeople: Partial<Record<TownId, CubeColor[]>>,
  tiles: Record<HexKey, Tile>,
): ExamplePosition {
  const towns = TOWN_IDS.flatMap((town): [HexKey, Tile][] => [
    [residenceSiteKey(town), residence(town, startingPeople[town] ?? [])],
    [stationKeyOf(town), station(town)],
  ])
  return { ...frame, tiles: { ...Object.fromEntries(towns), ...tiles } }
}

/** A game state holding the example's position, for asking the rules about it. */
export function stateOf(position: ExamplePosition): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount: position.playerCount, seed: 0 })
  return { ...state, tiles: position.tiles, townColors: EXAMPLE_TOWN_COLORS }
}

export interface PlacementCandidate {
  number: number
  at: HexKey
  kind: PlaceableKind
  color: TownColor
  isAllowed: boolean
  reason: string
}

export const PLACEMENT_EXAMPLE = {
  intro: 'Cobalt is choosing where to build, near town A’s Station. A and D are both Sand towns; B is Sage.',
  position: examplePosition({ playerCount: 3, columns: [0, 3], rows: [3, 6] }, { A: ['yellow', 'grey'], D: ['grey', 'pink'] }, {
    '1,4': residence('A', ['blue']),
    '1,6': residence('D'),
    // B's Sage tiles reach down to [3, 3] from its starting Residence.
    '4,2': building('factory', 'B'),
    '4,3': residence('B', ['pink']),
    '3,3': residence('B'),
  }),
  candidates: [
    {
      number: 1,
      at: '0,5',
      kind: 'residence',
      color: 'sand',
      isAllowed: true,
      reason: 'It touches A’s Sand Residence, so it joins town A.',
    },
    {
      number: 2,
      at: '1,5',
      kind: 'factory',
      color: 'sand',
      isAllowed: false,
      reason: 'It would connect towns A and D, which are both Sand.',
    },
    {
      number: 3,
      at: '2,4',
      kind: 'school',
      color: 'sage',
      isAllowed: true,
      reason: 'It touches B’s Sage Residence, so it joins town B. It also touches A’s tiles, so A and B merge.',
    },
    {
      number: 4,
      at: '0,4',
      kind: 'residence',
      color: 'slate',
      isAllowed: false,
      reason: 'No Slate tile is next to it.',
    },
  ] satisfies PlacementCandidate[],
}

// Town E during Saffron's turn: after immigration, then after housing.
const E_FRAME: Omit<ExamplePosition, 'tiles'> = { playerCount: 3, columns: [7, 10], rows: [5, 7] }
const E_FACTORY = '9,6'
const E_STATION = stationKeyOf('E')

export const IMMIGRATION_EXAMPLE = {
  position: examplePosition(E_FRAME, { E: ['grey', 'pink'] }, {
    [E_STATION]: station('E', ['yellow', 'grey', 'blue']),
    '8,6': residence('E', ['blue', 'grey']),
    [E_FACTORY]: building('factory', 'E'),
  }),
  placed: E_FACTORY,
  caption: [
    'Saffron builds a Sage Factory in town E. It borders no rail, so it’s worth 1 point at elections.',
    'Immigration: 3 people at E’s Station. Draw them from the bag and put them on it: a Saffron, a grey and a Cobalt.',
  ],
}

export const HOUSING_EXAMPLE = {
  position: examplePosition(E_FRAME, { E: ['grey', 'pink', 'grey'] }, {
    [E_STATION]: station('E', ['blue']),
    '8,6': residence('E', ['blue', 'grey', 'yellow']),
    [E_FACTORY]: building('factory', 'E'),
  }),
  moves: [
    { from: E_STATION, to: '8,6', home: 2 },
    { from: E_STATION, to: residenceSiteKey('E'), home: 2 },
  ] satisfies PersonArrow[],
  bagTags: [
    { at: '8,6', color: 'yellow', amount: 1, side: 'above' },
    { at: residenceSiteKey('E'), color: 'yellow', amount: 1, side: 'below' },
  ] satisfies BagTag[],
  caption: [
    'Then housing. E has space for 2 of the 3 waiting people, so Saffron, the active player, picks who moves in: the Saffron person and the grey one. The Cobalt one keeps waiting.',
    'Votes: Saffron adds 1 Saffron cube to the bag for each person housed, 2 in all.',
  ],
}

const B_SCHOOL = '4,1'
const B_HOME = '4,0'

// B's Residences were full, so two people were waiting at its Station.
export const SCHOOL_EXAMPLE = {
  position: examplePosition({ playerCount: 3, columns: [3, 6], rows: [0, 2] }, { B: ['grey', 'grey', 'yellow', 'blue'] }, {
    [B_HOME]: residence('B', ['pink', 'yellow', 'grey', 'grey']),
    '3,0': building('school', 'B'),
    [B_SCHOOL]: building('school', 'B'),
  }),
  placed: B_SCHOOL,
  moves: [
    { from: stationKeyOf('B'), to: residenceSiteKey('B'), home: 3 },
    { from: stationKeyOf('B'), to: B_HOME, home: 3 },
  ] satisfies PersonArrow[],
  bagTags: [
    { at: residenceSiteKey('B'), color: 'blue', amount: 2, side: 'below' },
    { at: B_HOME, color: 'blue', amount: 1, side: 'below' },
  ] satisfies BagTag[],
  caption: [
    'Cobalt builds a Sage School in town B. Relocation: each Residence next to it takes 1 person from anywhere, even though both are full. Cobalt takes the Cobalt and the grey person waiting at B’s Station.',
    'Votes: 1 Cobalt cube per person moved in, plus 1 for B’s starting Residence, which touches no other School. The other Residence touches the old School, so it adds nothing more. Cobalt adds 3 cubes in all.',
  ],
}

const C_NEW_RESIDENCE = '9,4'
/** The edge between the new Residence and E's Residence. */
const MERGER_LINE: [HexKey, HexKey] = [C_NEW_RESIDENCE, '8,5']

// E's Sage tiles reach [8, 5] from its Station by way of [8, 6]. C's starting Residence
// is just off the top of the figure.
export const MERGER_EXAMPLE = {
  position: examplePosition(
    { playerCount: 5, columns: [7, 10], rows: [3, 5] },
    { C: ['pink', 'blue', 'blue'], E: ['blue', 'pink', 'pink'] },
    {
      '10,4': building('factory', 'C'),
      [C_NEW_RESIDENCE]: residence('C', ['pink', 'grey']),
      '7,5': building('factory', 'E'),
      '8,6': residence('E', ['yellow', 'yellow']),
      '8,5': residence('E', ['blue', 'blue', 'pink']),
    },
  ),
  placed: C_NEW_RESIDENCE,
  housed: { from: stationKeyOf('C'), to: C_NEW_RESIDENCE, homes: [0, 1] },
  marker: { number: 1, between: MERGER_LINE },
  caption: [
    'Saffron builds a Slate Residence in town C (5 players), next to C’s Station. It also touches E’s Sage Residence.',
    'Housing comes first: the 2 people waiting at C’s Station move in, and Saffron adds 2 cubes to the bag.',
    'Then C and E merge into one city. Merger marker 1 goes on that edge, and only the new city votes.',
  ],
}

const MERGED_CITY: TownId[] = ['C', 'E']

/** The election that merger triggers, counted by the game; seats listed town by town. */
function mergerElection(): ElectionResult {
  const result = countVotes(stateOf(MERGER_EXAMPLE.position), MERGED_CITY)
  const townRank = (town: TownId) => MERGED_CITY.indexOf(town)
  return { ...result, seats: [...result.seats].sort((a, b) => townRank(a.town) - townRank(b.town)) }
}

export const ELECTION_EXAMPLE = {
  result: mergerElection(),
  caption: [
    'Each of the new city’s 5 Residences is a seat.',
    'In C, Cobalt wins the starting Residence outright. Saffron’s new Residence holds an Orchid and a grey, tied, so grey takes it.',
    'In E, Orchid wins the starting Residence, Saffron one of the new ones and Cobalt the other.',
    'Cobalt has the most seats, 2, and scores the city’s Factories: both border the rail, so 4 points.',
  ],
}
