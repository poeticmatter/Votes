import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { cityAt, crowdOf, residences, schoolRanks } from './boardQueries'
import { isSameMove, isWithinCity, movePerson, movesFrom } from './people'
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
// It always ends: levelling evens out the Residences' sizes, and a pull never makes them
// less even while moving someone up a rank for good. So the sum of the squared sizes plus
// each person's rank shortfall (2 minus their city's rank) falls with every move.

const LEVELLING_GAP = 2
const PULL_GAP = 1

interface Candidate {
  from: HexKey
  to: HexKey
}

function levellingCandidates(state: VotesState, homes: HexKey[]): Candidate[] {
  return homes.flatMap(from =>
    homes
      .filter(to => to !== from && isWithinCity(state, from, to))
      .filter(to => crowdOf(state, from) - crowdOf(state, to) >= LEVELLING_GAP)
      .map(to => ({ from, to })),
  )
}

function pullCandidates(state: VotesState, homes: HexKey[]): Candidate[] {
  const ranks = schoolRanks(state)
  const rankAt = (key: HexKey) => ranks.get(cityAt(state, key)[0]) ?? 0
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

/** Why the move happens: levelling within a city, or a pull from another. */
export function moveReason(state: VotesState, { from, to }: PersonMove): MoveReason {
  return isWithinCity(state, from, to) ? 'levelling' : 'schoolPull'
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
