import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { addToBag } from './bag'
import { activePlayerState, cityAt, crowdOf, distinctColors, factories, residences, schoolOwnersIn } from './boardQueries'
import { FACTORY_PULL_LIMIT, INDEPENDENT, RESIDENCE_PULL_GAP, type BagReason, type CubeColor, type Pull, type VotesState } from './types'

// Pulling people, after placing a tile, as often as the player likes. One person at a
// time moves into a Residence the active player owns, or a starting Residence, which
// anyone may pull into:
// - from a Factory, while the Residence holds fewer than 3 people. The Factory's owner
//   adds 1 of their cubes to the bag; a printed Factory, owned by nobody, adds a grey one.
// - from another Residence holding at least 2 more people than this one.
// Both come from the Residence's own city; a Residence in a city with a School may also
// pull from any other city, by the same rules. Each person brought from another city has
// a School owner add 1 cube to the bag: when the city's Schools have different owners, the
// player chooses whose.
//
// Pulls always run out: a pull from a Factory empties it a little, and a pull from a
// Residence with 2 more people makes the Residences more even.

/** Whether the active player may pull people into the Residence at `key`: their own, or a starting one. */
function isPullable(state: VotesState, key: HexKey): boolean {
  const tile = state.tiles[key]
  return tile?.kind === 'residence' && (tile.owner === null || tile.owner === activePlayerState(state).color)
}

function canReach(state: VotesState, from: HexKey, to: HexKey): boolean {
  return cityAt(state, from)[0] === cityAt(state, to)[0] || schoolOwnersIn(state, cityAt(state, to)).length > 0
}

function factorySources(state: VotesState, to: HexKey): HexKey[] {
  if (crowdOf(state, to) >= FACTORY_PULL_LIMIT) return []
  return factories(state)
    .filter(({ key, tile }) => tile.cubes.length > 0 && canReach(state, key, to))
    .map(({ key }) => key)
}

function residenceSources(state: VotesState, to: HexKey): HexKey[] {
  return residences(state)
    .map(({ key }) => key)
    .filter(from => from !== to && crowdOf(state, from) - crowdOf(state, to) >= RESIDENCE_PULL_GAP && canReach(state, from, to))
}

function cubesAt(state: VotesState, key: HexKey): CubeColor[] {
  const tile = state.tiles[key]
  if (tile?.kind === 'residence') return tile.people
  if (tile?.kind === 'factory') return tile.cubes
  return []
}

/** Whose School may be credited for a pull: nobody's within a city, else each owner of a School in the destination's city. */
function credits(state: VotesState, from: HexKey, to: HexKey): Pull['credit'][] {
  const city = cityAt(state, to)
  return cityAt(state, from)[0] === city[0] ? [null] : schoolOwnersIn(state, city)
}

/** Every pull the active player may make now. */
export function legalPulls(state: VotesState): Pull[] {
  if (state.phase.kind !== 'pulling') return []
  return residences(state)
    .map(({ key }) => key)
    .filter(to => isPullable(state, to))
    .flatMap(to =>
      [...factorySources(state, to), ...residenceSources(state, to)].flatMap(from =>
        distinctColors(cubesAt(state, from)).flatMap(color => credits(state, from, to).map(credit => ({ from, color, to, credit }))),
      ),
    )
}

const isSamePull = (a: Pull, b: Pull): boolean => a.from === b.from && a.color === b.color && a.to === b.to && a.credit === b.credit

/** `cubes` without one of `color`: the leftmost, the one who has been there longest. */
function withoutOne(cubes: CubeColor[], color: CubeColor): CubeColor[] {
  const index = cubes.indexOf(color)
  return cubes.filter((_, position) => position !== index)
}

function bag(state: VotesState, color: CubeColor, reason: BagReason): VotesState {
  const bagged = addToBag(state, color, 1)
  return { ...bagged, log: [...bagged.log, { kind: 'bagged', turn: state.turn.number, color, count: 1, reason }] }
}

/** Moves one person, and puts the Factory's and School's cubes in the bag. */
export function pull(state: VotesState, move: Pull): VotesState {
  if (!legalPulls(state).some(legal => isSamePull(legal, move))) {
    throw new IllegalMoveError(`Can't pull a ${move.color} person from ${move.from} into ${move.to}`)
  }
  const source = state.tiles[move.from]
  const target = state.tiles[move.to]
  if (!source || source.kind === 'school' || target?.kind !== 'residence') throw new Error(`Can't pull from ${move.from} into ${move.to}`)

  const movedSource = source.kind === 'factory' ? { ...source, cubes: withoutOne(source.cubes, move.color) } : { ...source, people: withoutOne(source.people, move.color) }
  const entry = { kind: 'pulled' as const, turn: state.turn.number, color: move.color, from: move.from, to: move.to }
  const pulled: VotesState = {
    ...state,
    tiles: { ...state.tiles, [move.from]: movedSource, [move.to]: { ...target, people: [...target.people, move.color] } },
    log: [...state.log, entry],
  }
  const afterFactory = source.kind === 'factory' ? bag(pulled, source.owner ?? INDEPENDENT, 'factory') : pulled
  return move.credit ? bag(afterFactory, move.credit, 'school') : afterFactory
}
