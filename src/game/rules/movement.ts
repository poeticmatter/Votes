import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { cityAt, crowdOf, residences, schoolRanks, tilesInBoardOrder, type SchoolRank } from './boardQueries'
import { isSameMove, movePerson, movesFrom } from './people'
import type { MoveReason, PersonMove, VotesState } from './types'

// Movement, after a flip or a School placement, until nobody can move. Two kinds of move,
// one person at a time, between face-up Residences:
// - Levelling: a person moves to another Residence in the same city that has at least 2
//   fewer people.
// - School pull: a city with a School takes a person from a Residence in a city without
//   one, into a Residence with fewer people than the source (a difference of 1 is
//   enough). A city with a University also takes from cities that have a School but no
//   University. A city is never pulled from by one that ranks the same or below it.
// Newcomers settle in their own city first: while anyone can level, nobody is pulled.
// Within each kind, the most crowded source moves first, into the least crowded
// destination; the active player breaks ties and chooses which person (colour) moves. A
// move that is the only one possible happens by itself. Moving adds nothing to the bag.
//
// Hubs (a proposed tile): every city with a Hub counts as one city for all of this, so
// people level between them, and they pull, and are pulled, as one, at the best rank
// any of them has.
//
// It always ends: levelling evens out the Residences' sizes, and a pull never makes them
// less even while moving someone up a rank for good. So the sum of the squared sizes plus
// each person's rank shortfall (2 minus their city's rank) falls with every move.

const LEVELLING_GAP = 2
const PULL_GAP = 1

interface Candidate {
  from: HexKey
  to: HexKey
}

/** Stands for every city with a Hub, which move people as one. */
const HUB_AREA = 'hub'

type MovementArea = TownId | typeof HUB_AREA

function hubCities(state: VotesState): Set<TownId> {
  return new Set(tilesInBoardOrder(state).flatMap(({ key, tile }) => (tile.kind === 'hub' ? [cityAt(state, key)[0]] : [])))
}

/** Which area each Residence moves people in: its city, or all the Hub cities together. */
function movementAreas(state: VotesState): (key: HexKey) => MovementArea {
  const hubs = hubCities(state)
  return key => {
    const town = cityAt(state, key)[0]
    return hubs.has(town) ? HUB_AREA : town
  }
}

/** The face-up Residences people in `city` can reach: its own, or every Hub city's if it has a Hub. */
export function residencesInReach(state: VotesState, city: TownId[]): HexKey[] {
  const areaOf = movementAreas(state)
  const area: MovementArea = hubCities(state).has(city[0]) ? HUB_AREA : city[0]
  return residences(state)
    .map(({ key }) => key)
    .filter(key => areaOf(key) === area)
}

function areaRanks(state: VotesState, areaOf: (key: HexKey) => MovementArea): (key: HexKey) => SchoolRank {
  const ranks = schoolRanks(state)
  const hubs = hubCities(state)
  const hubRank = Math.max(0, ...[...hubs].map(town => ranks.get(town) ?? 0)) as SchoolRank // the max of SchoolRanks is one
  return key => (areaOf(key) === HUB_AREA ? hubRank : (ranks.get(cityAt(state, key)[0]) ?? 0))
}

function levellingCandidates(state: VotesState, homes: HexKey[]): Candidate[] {
  const areaOf = movementAreas(state)
  return homes.flatMap(from =>
    homes
      .filter(to => to !== from && areaOf(to) === areaOf(from))
      .filter(to => crowdOf(state, from) - crowdOf(state, to) >= LEVELLING_GAP)
      .map(to => ({ from, to })),
  )
}

function pullCandidates(state: VotesState, homes: HexKey[]): Candidate[] {
  const rankAt = areaRanks(state, movementAreas(state))
  return homes.flatMap(from =>
    homes
      .filter(to => rankAt(to) > rankAt(from))
      .filter(to => crowdOf(state, from) - crowdOf(state, to) >= PULL_GAP)
      .map(to => ({ from, to })),
  )
}

/** Of `all`, the moves from the most crowded source into the least crowded destination. */
function mostCrowdedFirst(state: VotesState, all: Candidate[]): Candidate[] {
  if (all.length === 0) return []
  const mostAtSource = Math.max(...all.map(({ from }) => crowdOf(state, from)))
  const fromFullest = all.filter(({ from }) => crowdOf(state, from) === mostAtSource)
  const fewestAtDestination = Math.min(...fromFullest.map(({ to }) => crowdOf(state, to)))
  return fromFullest.filter(({ to }) => crowdOf(state, to) === fewestAtDestination)
}

/** The moves allowed now: levelling while any is possible, then School pulls. */
function candidates(state: VotesState): Candidate[] {
  const homes = residences(state).map(({ key }) => key)
  const levelling = levellingCandidates(state, homes)
  return mostCrowdedFirst(state, levelling.length > 0 ? levelling : pullCandidates(state, homes))
}

/** Every person the active player may move now, one move per colour at each source. */
export function movementMoves(state: VotesState): PersonMove[] {
  if (state.phase.kind !== 'movement') return []
  return candidates(state).flatMap(({ from, to }) => movesFrom(state, from, [to]))
}

/** Why the move happens: levelling within a city (or between Hub cities), or a pull from another. */
export function moveReason(state: VotesState, { from, to }: PersonMove): MoveReason {
  const areaOf = movementAreas(state)
  return areaOf(from) === areaOf(to) ? 'levelling' : 'schoolPull'
}

export function isMovementOver(state: VotesState): boolean {
  return movementMoves(state).length === 0
}

export function beginMovement(state: VotesState): VotesState {
  return { ...state, phase: { kind: 'movement' } }
}

export function moveOnePerson(state: VotesState, move: PersonMove): VotesState {
  if (!movementMoves(state).some(legal => isSameMove(legal, move))) {
    throw new IllegalMoveError(`Can't move a ${move.color} person from ${move.from} to ${move.to}`)
  }
  const moved = movePerson(state, move)
  const reason = moveReason(state, move)
  const entry = { kind: 'moved' as const, turn: state.turn.number, color: move.color, from: move.from, to: move.to, reason }
  return { ...moved, log: [...moved.log, entry] }
}

/** Makes moves for as long as only one is possible. */
export function moveWhileForced(state: VotesState): VotesState {
  let current = state
  for (let moves = movementMoves(current); moves.length === 1; moves = movementMoves(current)) {
    current = moveOnePerson(current, moves[0])
  }
  return current
}
