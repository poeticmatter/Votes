import { residenceSiteKey, TOWN_IDS } from '../../map/board'
import { hexKey, type HexKey } from '../../map/hexGrid'
import { STARTING_FACTORIES, type TownId } from '../../map/mapData'
import { countVotes } from '../../rules/elections'
import { beginMovement, isMovementOver, moveOnePerson } from '../../rules/movement'
import { createInitialState, DEFAULT_SETTINGS } from '../../rules/setup'
import type { CubeColor, ElectionResult, PersonMove, PlaceableKind, PlayerColor, PlayerCount, Tile, VotesState } from '../../rules/types'

// Positions for the rules sheet's worked examples, on the real map. examples.test.ts
// checks them against the game's rules. The examples where people move are played out by
// the game itself, from the position before to the one drawn, and so is the election.

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

/** A person who arrived from the bag; `home` is their place in the Residence's people. */
export interface ArrivalRing {
  at: HexKey
  home: number
}

const residence = (people: CubeColor[] = []): Tile => ({ kind: 'residence', people })
const building = (kind: 'factory' | 'mine' | 'school'): Tile => ({ kind })

/** Every town's starting Residence and the printed Factories, with `startingPeople`, under the example's own tiles. */
function examplePosition(
  frame: Omit<ExamplePosition, 'tiles'>,
  startingPeople: Partial<Record<TownId, CubeColor[]>>,
  tiles: Record<HexKey, Tile>,
): ExamplePosition {
  const towns = TOWN_IDS.map((town): [HexKey, Tile] => [residenceSiteKey(town), residence(startingPeople[town] ?? [])])
  const printed = STARTING_FACTORIES.map(([col, row]): [HexKey, Tile] => [hexKey(col, row), building('factory')])
  return { ...frame, tiles: { ...Object.fromEntries([...towns, ...printed]), ...tiles } }
}

/** A game state holding the example's position, for asking the rules about it. */
export function stateOf(position: ExamplePosition): VotesState {
  const state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount: position.playerCount, seed: 0 })
  return { ...state, tiles: position.tiles }
}

/** One of the moves a player makes, as a person's colour leaving one Residence for another. */
export type ExampleMove = PersonMove

/**
 * The position after `moves`, each one made through the rules' own movement, which
 * throws if the rules wouldn't allow it then. Movement must be over afterwards.
 */
function afterMoves(before: ExamplePosition, moves: ExampleMove[]): ExamplePosition {
  const after = moves.reduce(moveOnePerson, beginMovement(stateOf(before)))
  if (!isMovementOver(after)) throw new Error('A rules example stops while people could still move')
  return { ...before, tiles: after.tiles }
}

/** Arrows for `moves`, each to the place the person took in their new Residence. */
function arrowsFor(after: ExamplePosition, moves: ExampleMove[]): PersonArrow[] {
  return moves.map(({ from, to }, index) => {
    const laterInto = moves.slice(index + 1).filter(move => move.to === to).length
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
      at: '10,2',
      kind: 'factory',
      isAllowed: true,
      reason: 'It touches B’s Residence too.',
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
      reason: 'It touches no tile.',
    },
  ] satisfies PlacementCandidate[],
}

// Town A during Saffron's turns.
const A_FRAME: Omit<ExamplePosition, 'tiles'> = { playerCount: 3, columns: [7, 10], rows: [3, 6] }
const A_STARTING_RESIDENCE = residenceSiteKey('A')
const A_FACTORY = '7,5'
const A_SECOND_RESIDENCE = '7,6'

// After the Factory's 3 arrivals. Before, A's Residence held a grey and an Orchid, and the
// second Residence a Cobalt.
export const IMMIGRATION_EXAMPLE = {
  position: examplePosition(
    A_FRAME,
    { A: ['grey', 'pink', 'blue'] },
    { [A_FACTORY]: building('factory'), [A_SECOND_RESIDENCE]: residence(['blue', 'yellow', 'pink']) },
  ),
  placed: A_FACTORY,
  arrivals: [
    { at: A_SECOND_RESIDENCE, home: 1 },
    { at: A_STARTING_RESIDENCE, home: 2 },
    { at: A_SECOND_RESIDENCE, home: 2 },
  ] satisfies ArrivalRing[],
  bagTags: [{ at: A_SECOND_RESIDENCE, color: 'yellow', amount: 3, side: 'above' }] satisfies BagTag[],
  caption: [
    'Saffron builds a Factory touching A’s starting Residence. It touches no Mine, so it’s worth 1 at elections.',
    'Immigration: 3 people are drawn from the bag one at a time, and each moves into the least crowded Residence in the city.',
    'A Saffron goes into the second Residence, which held only 1. Then a Cobalt: both hold 2 now, so Saffron chooses A’s. Then an Orchid goes into the second Residence, the least crowded again.',
    'Votes: 3 people arrived, so Saffron adds 3 Saffron cubes to the bag.',
  ],
}

// A's Residence held 4 when Saffron built the second one beside it.
const LEVELLING_BEFORE = examplePosition(
  A_FRAME,
  { A: ['grey', 'pink', 'pink', 'blue'] },
  { [A_SECOND_RESIDENCE]: residence() },
)
const LEVELLING_MOVES: ExampleMove[] = [
  { from: A_STARTING_RESIDENCE, color: 'pink', to: A_SECOND_RESIDENCE },
  { from: A_STARTING_RESIDENCE, color: 'grey', to: A_SECOND_RESIDENCE },
]
const LEVELLING_AFTER = afterMoves(LEVELLING_BEFORE, LEVELLING_MOVES)

export const LEVELLING_EXAMPLE = {
  before: LEVELLING_BEFORE,
  position: LEVELLING_AFTER,
  placed: A_SECOND_RESIDENCE,
  moves: arrowsFor(LEVELLING_AFTER, LEVELLING_MOVES),
  bagTags: [{ at: A_SECOND_RESIDENCE, color: 'yellow', amount: 2, side: 'above' }] satisfies BagTag[],
  caption: [
    'Saffron builds a Residence beside A’s starting Residence, which holds 4 people.',
    'Levelling: a person may move to another Residence in the same city with at least 2 fewer people. 4 against 0, so one moves; then 3 against 1, so another; at 2 and 2 nobody can.',
    'Saffron chooses who moves: an Orchid, then the grey. Each Residence now holds a tie, and the Orchid on the left wins both seats.',
    'Votes: 2 people moved, so Saffron adds 2 Saffron cubes to the bag.',
  ],
}

const C_SCHOOL = '7,1'
const B_STARTING_RESIDENCE = residenceSiteKey('B')
const C_STARTING_RESIDENCE = residenceSiteKey('C')

// C held 1 person and B, with no School, 4, when Saffron built a School in C.
const SCHOOL_BEFORE = examplePosition(
  { playerCount: 3, columns: [6, 10], rows: [0, 3] },
  { C: ['grey'], B: ['blue', 'pink', 'pink', 'blue'] },
  { [C_SCHOOL]: building('school') },
)
const SCHOOL_MOVES: ExampleMove[] = [
  { from: B_STARTING_RESIDENCE, color: 'blue', to: C_STARTING_RESIDENCE },
  { from: B_STARTING_RESIDENCE, color: 'pink', to: C_STARTING_RESIDENCE },
]
const SCHOOL_AFTER = afterMoves(SCHOOL_BEFORE, SCHOOL_MOVES)

export const SCHOOL_EXAMPLE = {
  before: SCHOOL_BEFORE,
  position: SCHOOL_AFTER,
  placed: C_SCHOOL,
  moves: arrowsFor(SCHOOL_AFTER, SCHOOL_MOVES),
  bagTags: [{ at: '8,1', color: 'yellow', amount: 2, side: 'above' }] satisfies BagTag[],
  caption: [
    'Saffron builds a School in C. A city may have only one School.',
    'School pull: a city with a School pulls people from cities without one, from a Residence there into one here with fewer people. B’s Residence holds 4 and C’s 1, so a person comes; then 3 against 2, so another; at 2 against 3 nobody can.',
    'Saffron chooses who comes: a Cobalt, then an Orchid. A city with a School is never pulled from.',
    'Votes: 2 people moved, so Saffron adds 2 Saffron cubes to the bag.',
  ],
}

const MERGER_PLACED = '8,3'
const C_SECOND_RESIDENCE = '7,2'

// C's tiles reach down to [7, 2] and B's Residence is at [9, 2]; the new Residence at
// [8, 3] touches both. The Mine touches only C's tiles.
const MERGER_BEFORE = examplePosition(
  { playerCount: 3, columns: [7, 10], rows: [0, 4] },
  { C: ['pink', 'blue', 'blue'], B: ['blue', 'blue', 'pink'] },
  {
    '7,1': building('factory'),
    '8,1': building('mine'),
    '9,3': building('factory'),
    [C_SECOND_RESIDENCE]: residence(['yellow', 'blue']),
    [MERGER_PLACED]: residence(),
  },
)
const MERGER_MOVES: ExampleMove[] = [
  { from: C_STARTING_RESIDENCE, color: 'pink', to: MERGER_PLACED },
  { from: B_STARTING_RESIDENCE, color: 'blue', to: MERGER_PLACED },
]
const MERGER_AFTER = afterMoves(MERGER_BEFORE, MERGER_MOVES)

export const MERGER_EXAMPLE = {
  before: MERGER_BEFORE,
  position: MERGER_AFTER,
  placed: MERGER_PLACED,
  moves: arrowsFor(MERGER_AFTER, MERGER_MOVES),
  caption: [
    'Saffron builds a Residence that touches both C’s Residence and B’s.',
    'A tile that touches two cities joins them: B and C are one city, and people level across it at once. An Orchid from C and a Cobalt from B move into the new Residence.',
    'Then only the new city votes.',
  ],
}

const MERGED_CITY: TownId[] = ['B', 'C']

/** The election that merger triggers, counted by the game once everyone has moved. */
function mergerElection(): ElectionResult {
  return countVotes(stateOf(MERGER_EXAMPLE.position), MERGED_CITY)
}

export const ELECTION_EXAMPLE = {
  result: mergerElection(),
  caption: [
    'Each of the new city’s 4 Residences is a seat.',
    'Cobalt wins C’s starting Residence outright. The other three each hold a tie, so the colour furthest left wins: Cobalt B’s, Saffron the one next to C’s, and Orchid the new one.',
    'The city is worth 5: C’s Factory touches the Mine, 2; B’s Factory, 1; the Mine, 2.',
    'Worth 5 with 4 seats pays 2 points per seat: Cobalt scores 4, Saffron and Orchid 2 each.',
  ],
}
