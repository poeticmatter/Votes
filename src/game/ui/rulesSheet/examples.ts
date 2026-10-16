import { DISTRICT_IDS, districtOf, startingResidenceKey } from '../../map/board'
import type { HexKey } from '../../map/hexGrid'
import { STARTING_FACTORIES, type DistrictId } from '../../map/mapData'
import { countVotes } from '../../rules/elections'
import { createInitialState, DEFAULT_SETTINGS } from '../../rules/setup'
import type { CubeColor, ElectionResult, PlayerColor, PlayerCount, Tile, VotesState } from '../../rules/types'

// Positions for the rules sheet's worked examples, on the real map, ported from the
// asset generator's src/rules/examples.js. examples.test.ts checks them against the
// game's rules, and the election example is counted by the game itself.

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

const residence = (owner: PlayerColor, people: CubeColor[] = []): Tile => ({ kind: 'residence', owner, people })
const station = (owner: PlayerColor, people: CubeColor[] = []): Tile => ({ kind: 'station', owner, people })
const factory: Tile = { kind: 'factory' }
const school: Tile = { kind: 'school' }

/** The printed tiles, with `printedPeople` on their Residences, under the example's own tiles. */
function examplePosition(
  frame: Omit<ExamplePosition, 'tiles'>,
  printedPeople: Partial<Record<DistrictId, CubeColor[]>>,
  tiles: Record<HexKey, Tile>,
): ExamplePosition {
  const printedResidences = DISTRICT_IDS.map((district): [HexKey, Tile] => [
    startingResidenceKey(district),
    { kind: 'residence', owner: null, people: printedPeople[district] ?? [] },
  ])
  const printedFactories = STARTING_FACTORIES.map(([col, row]): [HexKey, Tile] => [`${col},${row}`, factory])
  return { ...frame, tiles: { ...Object.fromEntries([...printedResidences, ...printedFactories]), ...tiles } }
}

/** A game state holding the example's position, for asking the rules about it. */
export function stateOf(position: ExamplePosition): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount: position.playerCount, seed: 0 })
  return { ...state, tiles: position.tiles }
}

export interface PlacementCandidate {
  number: number
  at: HexKey
  tile: Tile
  isAllowed: boolean
  reason: string
}

export const PLACEMENT_EXAMPLE = {
  intro: 'Cobalt is choosing where to build in district B, in a 3-player game.',
  position: examplePosition({ playerCount: 3, columns: [3, 6], rows: [1, 3] }, { B: ['yellow', 'grey'] }, { '4,2': residence('pink') }),
  candidates: [
    {
      number: 1,
      at: '5,2',
      tile: factory,
      isAllowed: true,
      reason: 'It touches B’s printed Residence. It borders the rail, so it’s worth 2 points at elections.',
    },
    {
      number: 2,
      at: '4,3',
      tile: station('blue'),
      isAllowed: false,
      reason: 'This station site is marked 4+. With 3 players it isn’t used: it’s a normal hex, but not for a Station.',
    },
    {
      number: 3,
      at: '3,2',
      tile: station('blue'),
      isAllowed: false,
      reason: 'A Station only goes on a station site, even beside a rail.',
    },
    {
      number: 4,
      at: '6,1',
      tile: residence('blue'),
      isAllowed: false,
      reason: 'This hex is in C. It touches B’s Residence across the rail, but no tile in C.',
    },
  ] satisfies PlacementCandidate[],
}

// District E during Saffron's turn: after immigration, then after housing.
const E_FRAME: Omit<ExamplePosition, 'tiles'> = { playerCount: 3, columns: [7, 10], rows: [5, 7] }
const E_FACTORY = '9,6'

export const IMMIGRATION_EXAMPLE = {
  position: examplePosition(E_FRAME, { E: ['grey', 'pink'] }, {
    '7,6': station('blue', ['yellow', 'grey']),
    '8,6': residence('yellow', ['blue', 'grey']),
    [E_FACTORY]: factory,
    '9,5': residence('pink', ['yellow', 'grey']),
    '10,5': station('pink', ['pink', 'blue']),
  }),
  placed: E_FACTORY,
  /** Each Station's owner earns a cube per person drawn for it. */
  arrivals: [
    { station: '7,6', side: 'above' },
    { station: '10,5', side: 'below' },
  ] satisfies { station: HexKey; side: TagSide }[],
  caption: [
    'Saffron builds a Factory in E. It borders no rail, so it’s worth 1 point at elections.',
    'Immigration: 2 people at each Station in E. Draw them from the bag and put them on the Stations: Saffron and grey on Cobalt’s, Orchid and Cobalt on Orchid’s.',
    'Each Station’s owner earns 1 cube per person: Cobalt adds 2 Cobalt cubes to the bag, Orchid 2 Orchid.',
  ],
}

export const HOUSING_EXAMPLE = {
  position: examplePosition(E_FRAME, { E: ['grey', 'grey', 'pink'] }, {
    '7,6': station('blue'),
    '8,6': residence('yellow', ['yellow', 'blue', 'grey']),
    [E_FACTORY]: factory,
    '9,5': residence('pink', ['yellow', 'grey', 'blue']),
    '10,5': station('pink', ['pink']),
  }),
  moves: [
    { from: '7,6', to: '8,6', home: 0 },
    { from: '7,6', to: '8,7', home: 0 },
    { from: '10,5', to: '9,5', home: 2 },
  ] satisfies PersonArrow[],
  bagTags: [{ at: '8,6', color: 'yellow', amount: 1, side: 'above' }] satisfies BagTag[],
  caption: [
    'Then housing. E has space for 3 of the 4 waiting people, so Saffron, the active player, picks who moves in. Orchid’s cube keeps waiting.',
    'Saffron, from Cobalt’s Station into Saffron’s Residence: Saffron earns 1 cube.',
    'Grey into the printed Residence, and Cobalt from Orchid’s own Station into Orchid’s Residence: nobody earns one.',
  ],
}

// Orchid's Station had one person waiting, so every Residence in B was full.
export const SCHOOL_EXAMPLE = {
  position: examplePosition({ playerCount: 3, columns: [3, 6], rows: [0, 2] }, { B: ['yellow', 'pink', 'grey'] }, {
    '5,0': station('pink'),
    '4,0': residence('yellow', ['grey', 'yellow', 'pink']),
    '3,0': residence('blue', ['blue', 'grey', 'pink', 'blue']),
    '3,1': school,
  }),
  placed: '3,1',
  moves: [
    { from: '4,0', to: '3,0', home: 3 },
    { from: '5,0', to: '4,0', home: 2 },
  ] satisfies PersonArrow[],
  bagTags: [{ at: '4,0', color: 'yellow', amount: 1, side: 'below' }] satisfies BagTag[],
  caption: [
    'Cobalt builds a School in B. Relocation: the one Residence next to it, Cobalt’s, takes 1 person from anywhere, even though it’s full. Cobalt moves a Cobalt cube out of Saffron’s Residence.',
    'Housing: that freed a space, so the person waiting on Orchid’s Station moves into Saffron’s Residence. It came from another player’s Station, so Saffron earns 1 cube.',
    'The relocation itself earns nobody anything.',
  ],
}

const E_NEW_RESIDENCE = '9,4'
/** The district line between the new Residence and Jade's Station in C. */
const MERGER_LINE: [HexKey, HexKey] = [E_NEW_RESIDENCE, '9,3']

// Rows 5–7 of E are off the figure, but the election below counts them.
export const MERGER_EXAMPLE = {
  position: examplePosition(
    { playerCount: 5, columns: [7, 10], rows: [2, 4] },
    { C: ['pink', 'blue', 'blue'], E: ['blue', 'pink', 'grey'] },
    {
      '9,3': station('green'),
      '10,3': residence('vermillion'),
      '8,4': station('pink'),
      [E_NEW_RESIDENCE]: residence('yellow', ['pink', 'grey']),
      '8,5': residence('blue', ['blue', 'blue', 'pink']),
      '8,6': factory,
    },
  ),
  placed: E_NEW_RESIDENCE,
  housed: { from: '8,4', to: E_NEW_RESIDENCE, homes: [0, 1] },
  marker: { number: 1, between: MERGER_LINE },
  caption: [
    'Saffron builds a Residence in E (5 players), next to Orchid’s Station. It also touches Jade’s Station in C, across the rail.',
    'Housing comes first: the 2 people waiting on Orchid’s Station move in, and Saffron earns 2 cubes.',
    'Then C and E merge into one city. Merger marker 1 goes on that line, and only the new city votes.',
  ],
}

const MERGED_CITY: DistrictId[] = ['E', 'C']

/** The election that merger triggers, counted by the game; seats listed district by district. */
function mergerElection(): ElectionResult {
  const result = countVotes(stateOf(MERGER_EXAMPLE.position), MERGED_CITY)
  const districtRank = (key: HexKey) => MERGED_CITY.indexOf(districtOf(key))
  return { ...result, seats: [...result.seats].sort((a, b) => districtRank(a.residence) - districtRank(b.residence)) }
}

export const ELECTION_EXAMPLE = {
  result: mergerElection(),
  caption: [
    'Each of the new city’s 5 Residences is a seat.',
    'In E, Cobalt wins Cobalt’s Residence outright. The printed one is a three-way tie, so grey takes it. Saffron’s new Residence holds an Orchid and a grey, tied, so its owner, Saffron, takes it.',
    'In C, Cobalt has the most on the printed Residence. Vermillion’s is empty, a 0–0 tie, so Vermillion keeps it.',
    'Cobalt has the most seats, 2, and scores the city’s 3 Factories: 3 points.',
  ],
}
