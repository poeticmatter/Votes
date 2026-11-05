import { residenceSiteKey, TOWN_IDS } from '../../map/board'
import { hexKey, type HexKey } from '../../map/hexGrid'
import { STARTING_FACTORIES, type TownId } from '../../map/mapData'
import { countVotes } from '../../rules/elections'
import { beginMovement, isMovementOver, moveOnePerson } from '../../rules/movement'
import { createInitialState, DEFAULT_SETTINGS } from '../../rules/setup'
import type { CubeColor, ElectionResult, PersonMove, PlaceableKind, PlayerColor, PlayerCount, Tile, VotesState } from '../../rules/types'

// Positions for the rules sheet's worked examples, on the real map. examples.test.ts
// checks them against the game's rules. The examples where people move are played out by
// the game itself, from the position just after the flip or placement to the one drawn,
// and so is the election.

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

const residence = (people: CubeColor[] = []): Tile => ({ kind: 'residence', isFaceDown: false, people })
const faceDownResidence = (): Tile => ({ kind: 'residence', isFaceDown: true, people: [] })
const factory = (): Tile => ({ kind: 'factory', isFaceDown: false })
const faceDownFactory = (): Tile => ({ kind: 'factory', isFaceDown: true })
const school = (): Tile => ({ kind: 'school', isUniversity: false })

/** Every town's starting Residence and the printed Factories, with `startingPeople`, under the example's own tiles. */
function examplePosition(
  frame: Omit<ExamplePosition, 'tiles'>,
  startingPeople: Partial<Record<TownId, CubeColor[]>>,
  tiles: Record<HexKey, Tile>,
): ExamplePosition {
  const towns = TOWN_IDS.map((town): [HexKey, Tile] => [residenceSiteKey(town), residence(startingPeople[town] ?? [])])
  const printed = STARTING_FACTORIES.map(([col, row]): [HexKey, Tile] => [hexKey(col, row), factory()])
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
  intro: 'Cobalt is choosing where to place a tile from their supply, around town B in the east.',
  position: examplePosition({ playerCount: 3, columns: [7, 10], rows: [1, 4] }, { B: ['pink', 'blue'] }, {}),
  candidates: [
    {
      number: 1,
      at: '9,3',
      kind: 'residence',
      isAllowed: true,
      reason: 'It touches B’s Residence. It goes face down.',
    },
    {
      number: 2,
      at: '10,2',
      kind: 'factory',
      isAllowed: true,
      reason: 'It touches B’s Residence too, and also goes face down.',
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

// Town A during Saffron's turns.
const A_FRAME: Omit<ExamplePosition, 'tiles'> = { playerCount: 3, columns: [7, 10], rows: [3, 6] }
const A_STARTING_RESIDENCE = residenceSiteKey('A')
const A_PROMISE = '7,5'
const A_SECOND_RESIDENCE = '7,6'
const A_FACTORY = '8,5'

// Saffron places a Residence face down beside A, whose starting Residence holds 4.
export const PROMISE_EXAMPLE = {
  position: examplePosition(
    A_FRAME,
    { A: ['grey', 'pink', 'pink', 'blue'] },
    { [A_SECOND_RESIDENCE]: residence(['blue', 'yellow']), [A_PROMISE]: faceDownResidence() },
  ),
  placed: A_PROMISE,
  bagTags: [{ at: A_PROMISE, color: 'yellow', amount: 1, side: 'above' }] satisfies BagTag[],
  caption: [
    'Saffron places a Residence from their supply face down beside A. It’s a promise: no seat, and nobody moves into it yet.',
    'Votes: a face-down Residence adds 1 of your cubes to the bag for each overcrowded Residence (4 or more people) in its city. A’s starting Residence holds 4, so Saffron adds 1 Saffron cube.',
  ],
}

// A turn later, Orchid flips Saffron's promise; people level into it.
const LEVELLING_BEFORE = examplePosition(
  A_FRAME,
  { A: ['grey', 'pink', 'pink', 'blue'] },
  { [A_SECOND_RESIDENCE]: residence(['blue', 'yellow']), [A_PROMISE]: residence() },
)
const LEVELLING_MOVES: ExampleMove[] = [
  { from: A_STARTING_RESIDENCE, color: 'pink', to: A_PROMISE },
  { from: A_STARTING_RESIDENCE, color: 'grey', to: A_PROMISE },
]
const LEVELLING_AFTER = afterMoves(LEVELLING_BEFORE, LEVELLING_MOVES)

export const LEVELLING_EXAMPLE = {
  before: LEVELLING_BEFORE,
  position: LEVELLING_AFTER,
  placed: A_PROMISE,
  moves: arrowsFor(LEVELLING_AFTER, LEVELLING_MOVES),
  caption: [
    'On a later turn Orchid flips that Residence: any face-down tile may be flipped, anyone’s. Now it’s a seat.',
    'Levelling: a person may move to another Residence in the same city with at least 2 fewer people, the most crowded first. 4 against 0, so one moves; then 3 against 1, so another; then every Residence holds 2.',
    'Orchid chooses who moves: an Orchid, then the grey. The grey doesn’t vote, so Orchid wins the new seat. Moving adds nothing to the bag.',
  ],
}

// Saffron flips a face-down Factory beside A's Station hex. Before, A's starting
// Residence held a grey and an Orchid, and the second one a Cobalt.
export const IMMIGRATION_EXAMPLE = {
  position: examplePosition(
    A_FRAME,
    { A: ['grey', 'pink'] },
    { [A_FACTORY]: factory(), [A_SECOND_RESIDENCE]: residence(['blue', 'yellow']) },
  ),
  placed: A_FACTORY,
  arrivals: [{ at: A_SECOND_RESIDENCE, home: 1 }] satisfies ArrivalRing[],
  bagTags: [{ at: A_FACTORY, color: 'yellow', amount: 1, side: 'above' }] satisfies BagTag[],
  caption: [
    'Saffron flips a face-down Factory beside A. It brings 1 person from the bag for each city on the board, each into the least crowded Residence of that city.',
    'A’s person, a Saffron, goes into the second Residence, which held only 1. Every other city gets its own person the same way, so later Factories bring fewer as cities merge.',
    'Votes: each person who arrives adds 1 of Saffron’s cubes to the bag. From now on every seat in A scores 1 more point.',
  ],
}

const C_SCHOOL = '7,1'
const B_STARTING_RESIDENCE = residenceSiteKey('B')
const C_STARTING_RESIDENCE = residenceSiteKey('C')

// C held 1 person and B, with no School, 4, when Saffron placed a School in C.
const SCHOOL_BEFORE = examplePosition(
  { playerCount: 3, columns: [6, 10], rows: [0, 3] },
  { C: ['grey'], B: ['blue', 'pink', 'pink', 'blue'] },
  { [C_SCHOOL]: school() },
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
  caption: [
    'Saffron places a School in C, face up. A city may have only one School.',
    'School pull: a city with a School pulls people from cities without one, from a Residence there into one here with fewer people. B’s Residence holds 4 and C’s 1, so a person comes; then 3 against 2, so another; at 2 against 3 nobody can.',
    'Saffron chooses who comes: a Cobalt, then an Orchid. Nobody levels first, as there’s nothing to level.',
    'A city with two Schools, after a merger, can flip one into a University, which also pulls from cities with a School but no University.',
  ],
}

const MERGER_PLACED = '8,3'
const C_SECOND_RESIDENCE = '7,2'

// C's tiles reach down to [7, 2] and B's Residence is at [9, 2]; the face-down Residence
// at [8, 3] touches both.
export const MERGER_EXAMPLE = {
  position: examplePosition(
    { playerCount: 3, columns: [7, 10], rows: [0, 4] },
    { C: ['pink', 'blue', 'blue'], B: ['blue', 'blue', 'pink'] },
    {
      '7,1': factory(),
      '9,3': factory(),
      '8,0': faceDownFactory(),
      [C_SECOND_RESIDENCE]: residence(['yellow', 'blue']),
      [MERGER_PLACED]: faceDownResidence(),
    },
  ),
  placed: MERGER_PLACED,
  caption: [
    'Saffron places a Residence face down where it touches both C’s Residence and B’s.',
    'A tile that touches two cities joins them, face down or not: B and C are one city, and it votes at once. Nobody moves, since only a flip or a School moves people.',
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
    'Each face-up Residence in the new city is a seat: 3 of them. The face-down one is only a promise.',
    'Cobalt wins C’s and B’s starting Residences. The one next to C’s holds a Saffron and a Cobalt, tied, so the colour furthest left, Saffron, wins it.',
    'Each seat scores its holder 1 point per face-up Factory in the city. There are 2; the face-down one counts for nothing.',
    'Cobalt scores 4, Saffron 2.',
  ],
}
