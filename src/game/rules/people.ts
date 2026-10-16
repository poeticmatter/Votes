import type { HexKey } from '../map/hexGrid'
import { distinctColors, peopleAt } from './boardQueries'
import type { PersonMove, VotesState } from './types'

// Moving one person (cube) from a Residence or Station into a Residence: what both a
// School's relocation and housing do.

export function isSameMove(a: PersonMove, b: PersonMove): boolean {
  return a.from === b.from && a.color === b.color && a.to === b.to
}

/** Every way to move one person at `from` into one of `destinations`, one move per colour. */
export function movesFrom(state: VotesState, from: HexKey, destinations: HexKey[]): PersonMove[] {
  const colors = distinctColors(peopleAt(state, from))
  return colors.flatMap(color => destinations.filter(to => to !== from).map(to => ({ from, color, to })))
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
