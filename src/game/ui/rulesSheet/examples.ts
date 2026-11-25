import { residenceSiteKey, TOWN_IDS } from '../../map/board'
import { hexKey, type HexKey } from '../../map/hexGrid'
import { STARTING_FACTORIES, type TownId } from '../../map/mapData'
import { countVotes } from '../../rules/elections'
import { pull } from '../../rules/pulls'
import { createInitialState, DEFAULT_SETTINGS } from '../../rules/setup'
import { FACTORY_DRAW, type CubeColor, type ElectionResult, type PlaceableKind, type PlayerColor, type PlayerCount, type Pull, type Tile, type VotesState } from '../../rules/types'

// Positions for the rules sheet's worked examples, on the real map. examples.test.ts
// checks them against the game's rules. The examples where people are pulled are played
// out by the game itself, from the position just after the placement to the one drawn,
// and so is the election. Colours go by their in-game names: pink is Orchid, blue
// Cobalt, yellow Saffron.

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

// Every example seats 4 players, so Saffron (yellow) is in the game.
const PLAYERS: PlayerCount = 4

const residence = (people: CubeColor[] = [], owner: PlayerColor | null = null): Tile => ({ kind: 'residence', owner, people })
const factory = (cubes: CubeColor[] = [], owner: PlayerColor | null = null): Tile => ({ kind: 'factory', owner, cubes })
const school = (owner: PlayerColor): Tile => ({ kind: 'school', owner })

const PRINTED_FACTORIES = STARTING_FACTORIES.map(([col, row]) => hexKey(col, row))

/** Every town's starting Residence with `startingPeople`, and every printed Factory, empty, under the example's own tiles. */
function examplePosition(
  frame: Omit<ExamplePosition, 'tiles' | 'playerCount'>,
  startingPeople: Partial<Record<TownId, CubeColor[]>>,
  tiles: Record<HexKey, Tile>,
): ExamplePosition {
  const towns = TOWN_IDS.map((town): [HexKey, Tile] => [residenceSiteKey(town), residence(startingPeople[town] ?? [])])
  const printed = PRINTED_FACTORIES.map((key): [HexKey, Tile] => [key, factory()])
  return { ...frame, playerCount: PLAYERS, tiles: { ...Object.fromEntries([...towns, ...printed]), ...tiles } }
}

/**
 * A game state holding the example's position, with `active` (if given) pulling, for
 * asking the rules about it. The bag starts empty, so it holds only what the example adds.
 */
export function stateOf(position: ExamplePosition, active?: PlayerColor): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount: position.playerCount, seed: 0 })
  const seat = active ? state.players.findIndex(player => player.color === active) : state.turn.playerIndex
  return { ...state, tiles: position.tiles, bag: {}, turn: { ...state.turn, playerIndex: seat }, phase: active ? { kind: 'pulling' } : state.phase }
}

/** The position after `pulls` by `active`, each made through the rules, which throw if one isn't allowed then. */
function afterPulls(before: ExamplePosition, active: PlayerColor, pulls: Pull[]): { position: ExamplePosition; state: VotesState } {
  const state = pulls.reduce(pull, stateOf(before, active))
  return { position: { ...before, tiles: state.tiles }, state }
}

/** Arrows for `pulls`, each to the place the person took in their new Residence. */
function arrowsFor(after: ExamplePosition, pulls: Pull[]): PersonArrow[] {
  return pulls.map(({ from, to }, index) => {
    const laterInto = pulls.slice(index + 1).filter(move => move.to === to).length
    const people = after.tiles[to]?.kind === 'residence' ? after.tiles[to].people : []
    return { from, to, home: people.length - 1 - laterInto }
  })
}

export interface PlacementCandidate {
  number: number
  at: HexKey
  kind: PlaceableKind
  isAllowed: boolean
  reason: string
}

export const PLACEMENT_EXAMPLE = {
  intro: 'Cobalt is choosing where to place a tile from their supply, around town B in the east.',
  position: examplePosition({ columns: [7, 10], rows: [1, 4] }, { B: ['pink', 'blue'] }, {}),
  candidates: [
    {
      number: 1,
      at: '10,2',
      kind: 'residence',
      isAllowed: true,
      reason: 'It touches B’s Residence.',
    },
    {
      number: 2,
      at: '8,3',
      kind: 'school',
      isAllowed: true,
      reason: 'It touches B’s Residence too, and B has no School yet.',
    },
    {
      number: 3,
      at: '9,1',
      kind: 'school',
      isAllowed: false,
      reason: 'It touches B’s Residence, but nothing goes on mountains.',
    },
    {
      number: 4,
      at: '7,3',
      kind: 'residence',
      isAllowed: false,
      reason: 'It touches no tile.',
    },
  ] satisfies PlacementCandidate[],
}

// Town A during Saffron's and Orchid's turns.
const A_FRAME = { columns: [7, 10] as [number, number], rows: [3, 6] as [number, number] }
const A_STARTING_RESIDENCE = residenceSiteKey('A')
const A_FACTORY = '8,5'
const A_ORCHID_RESIDENCE = '7,6'
const DRAWN: CubeColor[] = ['blue', 'grey', 'yellow', 'pink', 'pink']

// Saffron places a Factory beside A; it draws 5 cubes from the bag.
export const FACTORY_EXAMPLE = {
  position: examplePosition(A_FRAME, { A: ['grey', 'pink'] }, { [A_FACTORY]: factory(DRAWN, 'yellow') }),
  placed: A_FACTORY,
  drawn: DRAWN,
  caption: [
    `Saffron places a Factory from their supply beside A. It draws ${FACTORY_DRAW} cubes from the bag: here a Cobalt, a grey, a Saffron and two Orchids.`,
    'The coloured outline shows it’s Saffron’s. From now on every seat in A scores 1 more point at elections.',
  ],
}

// On a later turn Orchid places a Residence beside A, then pulls from Saffron's Factory.
const FACTORY_PULLS: Pull[] = [
  { from: A_FACTORY, color: 'pink', to: A_ORCHID_RESIDENCE, credit: null },
  { from: A_FACTORY, color: 'pink', to: A_ORCHID_RESIDENCE, credit: null },
  { from: A_FACTORY, color: 'grey', to: A_ORCHID_RESIDENCE, credit: null },
]
const FACTORY_PULL_BEFORE = examplePosition(A_FRAME, { A: ['grey', 'pink'] }, {
  [A_FACTORY]: factory(DRAWN, 'yellow'),
  [A_ORCHID_RESIDENCE]: residence([], 'pink'),
})
const FACTORY_PULL_AFTER = afterPulls(FACTORY_PULL_BEFORE, 'pink', FACTORY_PULLS)

export const FACTORY_PULL_EXAMPLE = {
  before: FACTORY_PULL_BEFORE,
  position: FACTORY_PULL_AFTER.position,
  after: FACTORY_PULL_AFTER.state,
  placed: A_ORCHID_RESIDENCE,
  moves: arrowsFor(FACTORY_PULL_AFTER.position, FACTORY_PULLS),
  bagTags: [{ at: A_FACTORY, color: 'yellow', amount: FACTORY_PULLS.length, side: 'above' }] satisfies BagTag[],
  caption: [
    'Orchid places a Residence of their own beside A. Nobody moves in by itself: Orchid pulls people in after placing.',
    'A Residence holding fewer than 3 people may pull from a Factory in its city. Orchid pulls two Orchids and the grey, and stops at 3.',
    'Each person pulled from a Factory has its owner add 1 cube to the bag, so Saffron adds 3 Saffron cubes.',
  ],
}

// Orchid places a Residence in A and pulls from A's crowded starting Residence.
const RESIDENCE_PULL_PLACED = '7,5'
const A_SAFFRON_RESIDENCE = '7,6'
const RESIDENCE_PULLS: Pull[] = [
  { from: A_STARTING_RESIDENCE, color: 'pink', to: RESIDENCE_PULL_PLACED, credit: null },
  { from: A_STARTING_RESIDENCE, color: 'grey', to: RESIDENCE_PULL_PLACED, credit: null },
]
const RESIDENCE_PULL_BEFORE = examplePosition(A_FRAME, { A: ['grey', 'pink', 'pink', 'blue'] }, {
  [A_SAFFRON_RESIDENCE]: residence(['blue', 'yellow'], 'yellow'),
  [RESIDENCE_PULL_PLACED]: residence([], 'pink'),
})
const RESIDENCE_PULL_AFTER = afterPulls(RESIDENCE_PULL_BEFORE, 'pink', RESIDENCE_PULLS)

export const RESIDENCE_PULL_EXAMPLE = {
  before: RESIDENCE_PULL_BEFORE,
  position: RESIDENCE_PULL_AFTER.position,
  after: RESIDENCE_PULL_AFTER.state,
  placed: RESIDENCE_PULL_PLACED,
  moves: arrowsFor(RESIDENCE_PULL_AFTER.position, RESIDENCE_PULLS),
  caption: [
    'Orchid places a Residence in A. A has no Factory, but its starting Residence is crowded.',
    'A Residence may pull from another in its city that holds at least 2 more people. 4 against 0, so Orchid pulls an Orchid; then 3 against 1, so the grey; at 2 against 2 nobody more can come.',
    'The grey doesn’t vote, so Orchid holds the new seat. Orchid can’t pull into Saffron’s Residence: only into their own, and the starting ones.',
  ],
}

const C_SCHOOL = '7,1'
const B_STARTING_RESIDENCE = residenceSiteKey('B')
const C_STARTING_RESIDENCE = residenceSiteKey('C')
const SCHOOL_PULLS: Pull[] = [{ from: B_STARTING_RESIDENCE, color: 'blue', to: C_STARTING_RESIDENCE, credit: 'yellow' }]

// Saffron places a School in C, whose starting Residence holds 1, then pulls from B, which holds 4.
const SCHOOL_BEFORE = examplePosition({ columns: [6, 10], rows: [0, 3] }, { C: ['grey'], B: ['blue', 'pink', 'pink', 'blue'] }, { [C_SCHOOL]: school('yellow') })
const SCHOOL_AFTER = afterPulls(SCHOOL_BEFORE, 'yellow', SCHOOL_PULLS)

export const SCHOOL_EXAMPLE = {
  before: SCHOOL_BEFORE,
  position: SCHOOL_AFTER.position,
  after: SCHOOL_AFTER.state,
  placed: C_SCHOOL,
  moves: arrowsFor(SCHOOL_AFTER.position, SCHOOL_PULLS),
  bagTags: [{ at: C_SCHOOL, color: 'yellow', amount: SCHOOL_PULLS.length, side: 'above' }] satisfies BagTag[],
  caption: [
    'Saffron places their School in C. A city may have only one School when it’s placed.',
    'A Residence in a city with a School may pull from other cities too, by the same rules. Anyone may pull into a starting Residence, so Saffron pulls a Cobalt from B’s, 4 against 1; at 3 against 2 nobody more can come.',
    'Each person brought from another city has the School’s owner add 1 cube to the bag: Saffron adds a Saffron cube. B’s Factory is empty here, or C could have pulled from it too.',
  ],
}

const MERGER_PLACED = '8,3'
const C_SECOND_RESIDENCE = '7,2'

// C's tiles reach down to [7, 2] and B's Residence is at [9, 2]; the Residence at [8, 3]
// touches both. Both Factories are empty.
export const MERGER_EXAMPLE = {
  position: examplePosition(
    { columns: [6, 10], rows: [0, 4] },
    { C: ['pink', 'blue', 'blue'], B: ['blue', 'blue', 'pink'] },
    {
      '7,1': factory([], 'blue'),
      [C_SECOND_RESIDENCE]: residence(['yellow', 'blue'], 'blue'),
      [MERGER_PLACED]: residence([], 'yellow'),
    },
  ),
  placed: MERGER_PLACED,
  caption: [
    'Saffron places a Residence where it touches both C’s tiles and B’s Residence.',
    'A tile that touches two cities joins them: B and C are one city, and it votes at once, before Saffron pulls anyone.',
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
    'Each Residence in the new city is a seat, whoever owns it: 4 of them. The new one is empty, so nobody holds it.',
    'Cobalt wins C’s and B’s starting Residences. The one next to C’s holds a Saffron and a Cobalt, tied, so the colour furthest left, Saffron, wins it.',
    'Each seat scores its holder 1 point per Factory in the city. There are 2, B’s printed one and Cobalt’s, so Cobalt scores 4 and Saffron 2.',
    'After the vote, each of the city’s 4 Residences draws 1 person from the bag. Only then does Cobalt add 2 Cobalt cubes to the bag and Saffron 1 Saffron cube, 1 per seat won.',
  ],
}
