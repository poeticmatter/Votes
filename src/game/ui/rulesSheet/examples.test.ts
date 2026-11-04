import { describe, expect, it } from 'vitest'
import { hexAt, residenceSiteKey } from '../../map/board'
import { citiesOf, cityAt, industryValue, peopleAt } from '../../rules/boardQueries'
import { leastCrowdedResidences } from '../../rules/immigration'
import { citiesTouchedBy } from '../../rules/mergers'
import { beginMovement, isMovementOver } from '../../rules/movement'
import { legalPlacements, terrainFor } from '../../rules/placement'
import { DEFAULT_SETTINGS } from '../../rules/setup'
import { withTiles } from '../../rules/testStates'
import {
  ELECTION_EXAMPLE,
  IMMIGRATION_EXAMPLE,
  LEVELLING_EXAMPLE,
  MERGER_EXAMPLE,
  PLACEMENT_EXAMPLE,
  SCHOOL_EXAMPLE,
  stateOf,
  type ExamplePosition,
} from './examples'

// The rules sheet's examples must show what the game's rules actually do. The examples
// where people move are already played out through the rules by examples.ts, which
// throws if a move isn't allowed or movement isn't over.

const POSITIONS: [string, ExamplePosition][] = [
  ['placement', PLACEMENT_EXAMPLE.position],
  ['immigration', IMMIGRATION_EXAMPLE.position],
  ['levelling', LEVELLING_EXAMPLE.before],
  ['school', SCHOOL_EXAMPLE.before],
  ['merger', MERGER_EXAMPLE.before],
]

describe.each(POSITIONS)('the %s example', (name, position) => {
  const state = stateOf(position)

  it('puts Mines only on mountains, and every other tile on open hexes', () => {
    for (const [key, tile] of Object.entries(position.tiles)) {
      expect(hexAt(key).terrain).toBe(tile.kind === 'mine' ? terrainFor('mine') : 'open')
    }
  })

  it('connects every tile to a town, and keeps the towns apart except where the example merges them', () => {
    expect(citiesOf(state)).toHaveLength(name === 'merger' ? 4 : 5)
  })
})

describe('the placement example', () => {
  const state = stateOf(PLACEMENT_EXAMPLE.position)

  it.each(PLACEMENT_EXAMPLE.candidates)('marks candidate $number allowed only if the rules allow it', candidate => {
    expect(legalPlacements(state, candidate.kind).includes(candidate.at)).toBe(candidate.isAllowed)
  })
})

describe('the immigration example', () => {
  const state = stateOf(IMMIGRATION_EXAMPLE.position)
  const { arrivals, placed } = IMMIGRATION_EXAMPLE
  // The position is drawn after the arrivals; take them back out to replay them.
  const before = withTiles(state, {
    [residenceSiteKey('A')]: { kind: 'residence', people: ['grey', 'pink'] },
    '7,6': { kind: 'residence', people: ['blue'] },
  })
  const atPlacement = { ...before, turn: { ...before.turn, placedAt: placed } }

  it('builds a Factory touching no Mine, worth 1 as its caption says', () => {
    expect(industryValue(state, 'factory', placed)).toBe(1)
  })

  it('brings as many people as a Factory does', () => {
    expect(arrivals).toHaveLength(DEFAULT_SETTINGS.arrivals.factory)
  })

  it('sends the first person into the only least crowded Residence', () => {
    expect(leastCrowdedResidences(atPlacement)).toEqual([arrivals[0].at])
  })

  it('then has the two Residences tie, so the player chooses', () => {
    const afterFirst = withTiles(atPlacement, { '7,6': { kind: 'residence', people: ['blue', 'yellow'] } })
    expect(leastCrowdedResidences(afterFirst).sort()).toEqual([residenceSiteKey('A'), '7,6'].sort())
  })

  it('tags one cube for each person who arrived', () => {
    expect(IMMIGRATION_EXAMPLE.bagTags.reduce((sum, tag) => sum + tag.amount, 0)).toBe(arrivals.length)
  })
})

describe.each([
  ['levelling', LEVELLING_EXAMPLE],
  ['School', SCHOOL_EXAMPLE],
])('the %s example', (_, example) => {
  it('ends with nobody able to move', () => {
    expect(isMovementOver(beginMovement(stateOf(example.position)))).toBe(true)
  })

  it('points each arrow at a person in its destination', () => {
    for (const { to, home } of example.moves) expect(peopleAt(stateOf(example.position), to).length).toBeGreaterThan(home)
  })

  it('tags one cube for each person who moved', () => {
    expect(example.bagTags.reduce((sum, tag) => sum + tag.amount, 0)).toBe(example.moves.length)
  })
})

describe('the levelling example', () => {
  it('moves people only within their city', () => {
    const state = stateOf(LEVELLING_EXAMPLE.position)
    for (const { from, to } of LEVELLING_EXAMPLE.moves) expect(cityAt(state, from)).toEqual(cityAt(state, to))
  })
})

describe('the School example', () => {
  it('places the School where a School may go', () => {
    const { [SCHOOL_EXAMPLE.placed]: placed, ...rest } = SCHOOL_EXAMPLE.before.tiles
    expect(placed).toEqual({ kind: 'school' })
    expect(legalPlacements({ ...stateOf(SCHOOL_EXAMPLE.before), tiles: rest }, 'school')).toContain(SCHOOL_EXAMPLE.placed)
  })

  it('pulls people from another city, as its caption says', () => {
    const state = stateOf(SCHOOL_EXAMPLE.position)
    for (const { from, to } of SCHOOL_EXAMPLE.moves) expect(cityAt(state, from)).not.toEqual(cityAt(state, to))
  })
})

describe('the merger example', () => {
  it('joins C to B', () => {
    const withoutNew = Object.fromEntries(Object.entries(MERGER_EXAMPLE.before.tiles).filter(([key]) => key !== MERGER_EXAMPLE.placed))
    const { own, joins } = citiesTouchedBy({ ...stateOf(MERGER_EXAMPLE.before), tiles: withoutNew }, MERGER_EXAMPLE.placed)
    expect([own, ...joins.map(join => join.city)].flat().sort()).toEqual(['B', 'C'])
  })

  it('levels people into the new Residence until nobody can move', () => {
    expect(isMovementOver(beginMovement(stateOf(MERGER_EXAMPLE.position)))).toBe(true)
    expect(MERGER_EXAMPLE.moves.every(move => move.to === MERGER_EXAMPLE.placed)).toBe(true)
  })
})

describe('the election example', () => {
  const { result } = ELECTION_EXAMPLE

  it('has 4 seats', () => {
    expect(result.seats).toHaveLength(4)
  })

  it('gives the three tied Residences to the colours furthest left', () => {
    expect(result.seats.filter(seat => seat.reason === 'leftmostOfTie').map(seat => seat.winner).sort()).toEqual(['blue', 'pink', 'yellow'])
  })

  it('values the city at 5 and pays 2 per seat, as its caption says', () => {
    expect(result).toMatchObject({ cityValue: 5, pointsPerSeat: 2 })
  })

  it('has Cobalt score 4, Saffron and Orchid 2 each', () => {
    expect(result.scores).toEqual({ blue: 4, yellow: 2, pink: 2 })
  })
})
