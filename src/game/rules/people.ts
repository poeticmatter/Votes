import type { HexKey } from '../map/hexGrid'
import { distinctColors, cityAt, peopleAt } from './boardQueries'
import { areNeighborCities } from './cities'
import type { PersonMove, VotesState } from './types'

// Moving one person (cube) from a Residence or Station into a Residence: what both a
// School's relocation and housing do. People move within their city, or from a
// neighboring city; only a move within the city earns the mover a vote.

/** Whether the tile at `from` is in the city of the Residence at `to`. */
export function isWithinCity(state: VotesState, from: HexKey, to: HexKey): boolean {
  return cityAt(state, from)[0] === cityAt(state, to)[0]
}

/** Whether a person at `from` may move into the Residence at `to`: within its city or from a neighbor. */
export function canMoveBetween(state: VotesState, from: HexKey, to: HexKey): boolean {
  return isWithinCity(state, from, to) || areNeighborCities(cityAt(state, from), cityAt(state, to))
}

/** Cubes the move earns the active player: 1 for a person from within the city, none from a neighbor. */
export function votesForMove(state: VotesState, from: HexKey, to: HexKey): number {
  return isWithinCity(state, from, to) ? 1 : 0
}

export function isSameMove(a: PersonMove, b: PersonMove): boolean {
  return a.from === b.from && a.color === b.color && a.to === b.to
}

/** Every way to move one person at `from` into one of `destinations` they may reach, one move per colour. */
export function movesFrom(state: VotesState, from: HexKey, destinations: HexKey[]): PersonMove[] {
  const colors = distinctColors(peopleAt(state, from))
  const reachable = destinations.filter(to => to !== from && canMoveBetween(state, from, to))
  return colors.flatMap(color => reachable.map(to => ({ from, color, to })))
}

/** Moves the person; the caller has checked the move is legal. */
export function movePerson(state: VotesState, { from, color, to }: PersonMove): VotesState {
  const source = state.tiles[from]
  const target = state.tiles[to]
  if ((source?.kind !== 'residence' && source?.kind !== 'station') || target?.kind !== 'residence') {
    throw new Error(`Can't move a person from ${from} to ${to}`)
  }
  const index = source.people.indexOf(color)
  if (index < 0) throw new Error(`No ${color} person at ${from}`)

  return {
    ...state,
    tiles: {
      ...state.tiles,
      [from]: { ...source, people: source.people.filter((_, position) => position !== index) },
      [to]: { ...target, people: [...target.people, color] },
    },
  }
}
