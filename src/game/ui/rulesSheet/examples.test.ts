import { describe, expect, it } from 'vitest'
import { hexAt, residenceSiteKey } from '../../map/board'
import { citiesOf, cityAt, factoryCountIn, peopleAt } from '../../rules/boardQueries'
import { citiesTouchedBy } from '../../rules/mergers'
import { legalPlacements } from '../../rules/placement'
import { legalPulls } from '../../rules/pulls'
import { FACTORY_DRAW } from '../../rules/types'
import {
  ELECTION_EXAMPLE,
  FACTORY_EXAMPLE,
  FACTORY_PULL_EXAMPLE,
  MERGER_EXAMPLE,
  PLACEMENT_EXAMPLE,
  RESIDENCE_PULL_EXAMPLE,
  SCHOOL_EXAMPLE,
  stateOf,
  type ExamplePosition,
} from './examples'

// The rules sheet's examples must show what the game's rules actually do. The examples
// where people are pulled are already played out through the rules by examples.ts, which
// throws if a pull isn't allowed.

const POSITIONS: [string, ExamplePosition][] = [
  ['placement', PLACEMENT_EXAMPLE.position],
  ['Factory', FACTORY_EXAMPLE.position],
  ['Factory pull', FACTORY_PULL_EXAMPLE.before],
  ['Residence pull', RESIDENCE_PULL_EXAMPLE.before],
  ['School', SCHOOL_EXAMPLE.before],
  ['merger', MERGER_EXAMPLE.position],
]

/** The position with the tile at `at` taken back off the board, as it was before it was placed. */
function withoutTile(position: ExamplePosition, at: string): ExamplePosition {
  return { ...position, tiles: Object.fromEntries(Object.entries(position.tiles).filter(([key]) => key !== at)) }
}

describe.each(POSITIONS)('the %s example', (name, position) => {
  it('puts tiles only on open hexes', () => {
    for (const key of Object.keys(position.tiles)) expect(hexAt(key).terrain).toBe('open')
  })

  it('connects every tile to a town, and keeps the towns apart except where the example merges them', () => {
    expect(citiesOf(stateOf(position))).toHaveLength(name === 'merger' ? 4 : 5)
  })
})

describe('the placement example', () => {
  const state = stateOf(PLACEMENT_EXAMPLE.position)

  it.each(PLACEMENT_EXAMPLE.candidates)('marks candidate $number allowed only if the rules allow it', candidate => {
    expect(legalPlacements(state, candidate.kind).includes(candidate.at)).toBe(candidate.isAllowed)
  })
})

describe('the Factory example', () => {
  it('places the Factory where the rules allow it', () => {
    expect(legalPlacements(stateOf(withoutTile(FACTORY_EXAMPLE.position, FACTORY_EXAMPLE.placed)), 'factory')).toContain(FACTORY_EXAMPLE.placed)
  })

  it('shows as many cubes as a Factory draws', () => {
    expect(FACTORY_EXAMPLE.drawn).toHaveLength(FACTORY_DRAW)
  })
})

describe.each([
  ['Factory pull', FACTORY_PULL_EXAMPLE],
  ['Residence pull', RESIDENCE_PULL_EXAMPLE],
  ['School', SCHOOL_EXAMPLE],
])('the %s example', (_, example) => {
  it('stops where the Residence can pull nobody more', () => {
    const into = example.moves[0].to
    expect(legalPulls(example.after).filter(move => move.to === into)).toEqual([])
  })

  it('points each arrow at a person in its destination', () => {
    for (const { to, home } of example.moves) expect(peopleAt(stateOf(example.position), to).length).toBeGreaterThan(home)
  })
})

describe('the Factory pull example', () => {
  it('tags one of the Factory owner’s cubes for each person pulled', () => {
    expect(FACTORY_PULL_EXAMPLE.after.bag.yellow).toBe(FACTORY_PULL_EXAMPLE.bagTags[0].amount)
  })
})

describe('the Residence pull example', () => {
  it('pulls only within the city', () => {
    const state = stateOf(RESIDENCE_PULL_EXAMPLE.position)
    for (const { from, to } of RESIDENCE_PULL_EXAMPLE.moves) expect(cityAt(state, from)).toEqual(cityAt(state, to))
  })
})

describe('the School example', () => {
  it('places the School where a School may go', () => {
    expect(legalPlacements(stateOf(withoutTile(SCHOOL_EXAMPLE.before, SCHOOL_EXAMPLE.placed)), 'school')).toContain(SCHOOL_EXAMPLE.placed)
  })

  it('pulls from another city, and tags the School owner’s cube for it', () => {
    const state = stateOf(SCHOOL_EXAMPLE.position)
    for (const { from, to } of SCHOOL_EXAMPLE.moves) expect(cityAt(state, from)).not.toEqual(cityAt(state, to))
    expect(SCHOOL_EXAMPLE.after.bag.yellow).toBe(SCHOOL_EXAMPLE.bagTags[0].amount)
  })
})

describe('the merger example', () => {
  it('joins C to B with a Residence', () => {
    const { own, joins } = citiesTouchedBy(stateOf(withoutTile(MERGER_EXAMPLE.position, MERGER_EXAMPLE.placed)), MERGER_EXAMPLE.placed)
    expect([own, ...joins.map(join => join.city)].flat().sort()).toEqual(['B', 'C'])
  })
})

describe('the election example', () => {
  const { result } = ELECTION_EXAMPLE

  it('has 4 seats, the new Residence’s held by nobody', () => {
    expect(result.seats).toHaveLength(4)
    expect(result.seats.find(seat => seat.residence === MERGER_EXAMPLE.placed)?.winner).toBeNull()
  })

  it('gives the tied Residence to Saffron, the colour furthest left', () => {
    expect(result.seats.filter(seat => seat.reason === 'leftmostOfTie').map(seat => seat.winner)).toEqual(['yellow'])
  })

  it('pays 2 per seat, for the 2 Factories, as its caption says', () => {
    expect(result.pointsPerSeat).toBe(2)
    expect(factoryCountIn(stateOf(MERGER_EXAMPLE.position), ['B', 'C'])).toBe(2)
  })

  it('has Cobalt score 4 and Saffron 2', () => {
    expect(result.scores).toEqual({ blue: 4, yellow: 2 })
  })

  it('counts a starting Residence of each town', () => {
    expect(result.seats.map(seat => seat.residence)).toEqual(expect.arrayContaining([residenceSiteKey('B'), residenceSiteKey('C')]))
  })
})
