import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { addVote } from './bag'
import { activePlayerState, cityAt, crowdOf, residences, schoolCities } from './boardQueries'
import { isSameMove, isWithinCity, movePerson, movesFrom } from './people'
import type { MoveReason, PersonMove, VotesState } from './types'

// Movement, after every placement, until nobody can move. Two kinds of move, one person
// at a time:
// - Levelling: a person moves to another Residence in the same city that has at least 2
//   fewer people.
// - School pull: a city with a School takes a person from a Residence in a city without
//   one, into a Residence with fewer people than the source (a difference of 1 is enough).
//   A School city is never pulled from.
// The most crowded source moves first, into the least crowded destination; the active
// player breaks ties and chooses which person (colour) moves. A move that is the only one
// possible happens by itself. Every person who moves adds 1 of the active player's cubes
// to the bag.
//
// It always ends: levelling evens out the Residences' sizes, and a School pull never makes
// them less even while taking someone out of a School-less city for good. So the sum of
// the squared sizes plus the number of people outside School cities falls with every move.

const LEVELLING_GAP = 2
const PULL_GAP = 1

interface Candidate {
  from: HexKey
  to: HexKey
}

/** Every move the rules allow, before most-crowded-first narrows them down. */
function allCandidates(state: VotesState): Candidate[] {
  const schools = schoolCities(state)
  const hasSchool = (key: HexKey) => schools.has(cityAt(state, key)[0])
  const homes = residences(state).map(({ key }) => key)
  return homes.flatMap(from => {
    const size = crowdOf(state, from)
    if (size === 0) return []
    return homes.flatMap((to): Candidate[] => {
      if (to === from) return []
      const gap = size - crowdOf(state, to)
      if (isWithinCity(state, from, to)) return gap >= LEVELLING_GAP ? [{ from, to }] : []
      const isPull = hasSchool(to) && !hasSchool(from) && gap >= PULL_GAP
      return isPull ? [{ from, to }] : []
    })
  })
}

/** The moves allowed now: from the most crowded source, into the least crowded destination. */
function candidates(state: VotesState): Candidate[] {
  const all = allCandidates(state)
  if (all.length === 0) return []
  const mostAtSource = Math.max(...all.map(({ from }) => crowdOf(state, from)))
  const fromFullest = all.filter(({ from }) => crowdOf(state, from) === mostAtSource)
  const fewestAtDestination = Math.min(...fromFullest.map(({ to }) => crowdOf(state, to)))
  return fromFullest.filter(({ to }) => crowdOf(state, to) === fewestAtDestination)
}

/** Every person the active player may move now, one move per colour at each source. */
export function movementMoves(state: VotesState): PersonMove[] {
  if (state.phase.kind !== 'movement') return []
  return candidates(state).flatMap(({ from, to }) => movesFrom(state, from, [to]))
}

/** Why the move happens: levelling within a city, or a School pull from another. */
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
  const voter = activePlayerState(state).color
  const reason = moveReason(state, move)
  const entry = { kind: 'moved' as const, turn: state.turn.number, color: move.color, from: move.from, to: move.to, voter, reason }
  return addVote({ ...moved, log: [...moved.log, entry] })
}

/** Makes moves for as long as only one is possible. */
export function moveWhileForced(state: VotesState): VotesState {
  let current = state
  for (let moves = movementMoves(current); moves.length === 1; moves = movementMoves(current)) {
    current = moveOnePerson(current, moves[0])
  }
  return current
}
