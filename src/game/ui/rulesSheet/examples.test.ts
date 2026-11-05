import { describe, expect, it } from 'vitest'
import { hexAt, residenceSiteKey } from '../../map/board'
import { overcrowdedAround } from '../../rules/actions'
import { citiesOf, cityAt, faceUpFactoriesIn, peopleAt } from '../../rules/boardQueries'
import { leastCrowdedResidences } from '../../rules/immigration'
import { citiesTouchedBy } from '../../rules/mergers'
import { beginMovement, isMovementOver } from '../../rules/movement'
import { legalPlacements } from '../../rules/placement'
import { withTiles, withTilesInHand } from '../../rules/testStates'
import {
  ELECTION_EXAMPLE,
  IMMIGRATION_EXAMPLE,
  LEVELLING_EXAMPLE,
  MERGER_EXAMPLE,
  PLACEMENT_EXAMPLE,
  PROMISE_EXAMPLE,
  SCHOOL_EXAMPLE,
  stateOf,
  type ExamplePosition,
} from './examples'

// The rules sheet's examples must show what the game's rules actually do. The examples
// where people move are already played out through the rules by examples.ts, which
// throws if a move isn't allowed or movement isn't over.

const POSITIONS: [string, ExamplePosition][] = [
  ['placement', PLACEMENT_EXAMPLE.position],
  ['promise', PROMISE_EXAMPLE.position],
  ['immigration', IMMIGRATION_EXAMPLE.position],
  ['levelling', LEVELLING_EXAMPLE.before],
  ['school', SCHOOL_EXAMPLE.before],
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
  const state = withTilesInHand(stateOf(PLACEMENT_EXAMPLE.position), { factory: 1, school: 1 })

  it.each(PLACEMENT_EXAMPLE.candidates)('marks candidate $number allowed only if the rules allow it', candidate => {
    expect(legalPlacements(state, candidate.kind).includes(candidate.at)).toBe(candidate.isAllowed)
  })
})

describe('the promise example', () => {
  const state = stateOf(PROMISE_EXAMPLE.position)

  it('places the Residence face down', () => {
    expect(PROMISE_EXAMPLE.position.tiles[PROMISE_EXAMPLE.placed]).toEqual({ kind: 'residence', isFaceDown: true, people: [] })
  })

  it('tags one cube for each overcrowded Residence in the city', () => {
    const votes = PROMISE_EXAMPLE.bagTags.reduce((sum, tag) => sum + tag.amount, 0)
    expect(votes).toBe(overcrowdedAround(state, PROMISE_EXAMPLE.placed))
    expect(votes).toBe(1)
  })
})

describe('the immigration example', () => {
  const { arrivals, placed } = IMMIGRATION_EXAMPLE
  // The position is drawn after A's arrival; take it back out to replay it.
  const before = withTiles(stateOf(IMMIGRATION_EXAMPLE.position), { '7,6': { kind: 'residence', isFaceDown: false, people: ['blue'] } })

  it('flips a Factory that is now face up', () => {
    expect(IMMIGRATION_EXAMPLE.position.tiles[placed]).toEqual({ kind: 'factory', isFaceDown: false })
  })

  it('sends A’s person into the least crowded Residence', () => {
    expect(leastCrowdedResidences(before, cityAt(before, placed))).toEqual([arrivals[0].at])
  })

  it('tags one cube for A’s arrival', () => {
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
})

describe('the levelling example', () => {
  it('flips the promise from the example before it', () => {
    expect(LEVELLING_EXAMPLE.placed).toBe(PROMISE_EXAMPLE.placed)
  })

  it('moves people only within their city', () => {
    const state = stateOf(LEVELLING_EXAMPLE.position)
    for (const { from, to } of LEVELLING_EXAMPLE.moves) expect(cityAt(state, from)).toEqual(cityAt(state, to))
  })
})

describe('the School example', () => {
  it('places the School where a School may go', () => {
    const before = withTilesInHand(stateOf(withoutTile(SCHOOL_EXAMPLE.before, SCHOOL_EXAMPLE.placed)), { school: 1 })
    expect(legalPlacements(before, 'school')).toContain(SCHOOL_EXAMPLE.placed)
  })

  it('pulls people from another city, as its caption says', () => {
    const state = stateOf(SCHOOL_EXAMPLE.position)
    for (const { from, to } of SCHOOL_EXAMPLE.moves) expect(cityAt(state, from)).not.toEqual(cityAt(state, to))
  })
})

describe('the merger example', () => {
  it('joins C to B with a face-down Residence', () => {
    const { own, joins } = citiesTouchedBy(stateOf(withoutTile(MERGER_EXAMPLE.position, MERGER_EXAMPLE.placed)), MERGER_EXAMPLE.placed)
    expect([own, ...joins.map(join => join.city)].flat().sort()).toEqual(['B', 'C'])
    expect(MERGER_EXAMPLE.position.tiles[MERGER_EXAMPLE.placed]).toEqual({ kind: 'residence', isFaceDown: true, people: [] })
  })
})

describe('the election example', () => {
  const { result } = ELECTION_EXAMPLE

  it('has 3 seats, leaving out the face-down Residence', () => {
    expect(result.seats).toHaveLength(3)
  })

  it('gives the tied Residence to Saffron, the colour furthest left', () => {
    expect(result.seats.filter(seat => seat.reason === 'leftmostOfTie').map(seat => seat.winner)).toEqual(['yellow'])
  })

  it('pays 2 per seat, for the 2 face-up Factories, as its caption says', () => {
    expect(result.pointsPerSeat).toBe(2)
    expect(faceUpFactoriesIn(stateOf(MERGER_EXAMPLE.position), ['B', 'C'])).toBe(2)
  })

  it('has Cobalt score 4 and Saffron 2', () => {
    expect(result.scores).toEqual({ blue: 4, yellow: 2 })
  })

  it('counts a starting Residence of each town', () => {
    expect(result.seats.map(seat => seat.residence)).toEqual(expect.arrayContaining([residenceSiteKey('B'), residenceSiteKey('C')]))
  })
})
