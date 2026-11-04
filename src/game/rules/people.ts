import type { HexKey } from '../map/hexGrid'
import { distinctColors, cityAt, peopleAt } from './boardQueries'
import type { PersonMove, VotesState } from './types'

// Moving one person (cube) from one Residence to another, which is what levelling and
// School pulls do.

/** Whether the tile at `from` is in the same city as the one at `to`. */
export function isWithinCity(state: VotesState, from: HexKey, to: HexKey): boolean {
  return cityAt(state, from)[0] === cityAt(state, to)[0]
}

export function isSameMove(a: PersonMove, b: PersonMove): boolean {
  return a.from === b.from && a.color === b.color && a.to === b.to
}

/** Every way to move one person at `from` into one of `destinations`, one move per colour. */
export function movesFrom(state: VotesState, from: HexKey, destinations: HexKey[]): PersonMove[] {
  const colors = distinctColors(peopleAt(state, from))
  const elsewhere = destinations.filter(to => to !== from)
  return colors.flatMap(color => elsewhere.map(to => ({ from, color, to })))
}

/** Moves the person; the caller has checked the move is legal. */
export function movePerson(state: VotesState, { from, color, to }: PersonMove): VotesState {
  const source = state.tiles[from]
  const target = state.tiles[to]
  if (source?.kind !== 'residence' || target?.kind !== 'residence') {
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
