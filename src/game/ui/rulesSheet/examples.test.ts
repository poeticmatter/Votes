import { describe, expect, it } from 'vitest'
import { hexAt, residenceSiteKey, stationKeyOf } from '../../map/board'
import { citiesOf, cityAt, industryValue, peopleAt, stationsInCity } from '../../rules/boardQueries'
import { beginHousing, housingMoves } from '../../rules/housing'
import { citiesTouchedBy } from '../../rules/mergers'
import { legalPlacements, terrainFor } from '../../rules/placement'
import { DEFAULT_SETTINGS } from '../../rules/setup'
import { withTiles } from '../../rules/testStates'
import { RESIDENCE_CAPACITY } from '../../rules/types'
import {
  ELECTION_EXAMPLE,
  HOUSING_EXAMPLE,
  IMMIGRATION_EXAMPLE,
  MERGER_EXAMPLE,
  PLACEMENT_EXAMPLE,
  SCHOOL_EXAMPLE,
  stateOf,
  type ExamplePosition,
} from './examples'

// The rules sheet's examples must show what the game's rules actually do.

const POSITIONS: [string, ExamplePosition][] = [
  ['placement', PLACEMENT_EXAMPLE.position],
  ['immigration', IMMIGRATION_EXAMPLE.position],
  ['housing', HOUSING_EXAMPLE.position],
  ['school', SCHOOL_EXAMPLE.position],
  ['merger', MERGER_EXAMPLE.position],
]

describe.each(POSITIONS)('the %s example', (name, position) => {
  const state = stateOf(position)

  it('puts Mines only on mountains, and every other tile on open hexes', () => {
    for (const [key, tile] of Object.entries(position.tiles)) {
      const terrain = tile.kind === 'mine' ? terrainFor('mine') : 'open'
      expect(hexAt(key).terrain).toBe(terrain)
    }
  })

  it('has Stations only where they are printed', () => {
    for (const [key, tile] of Object.entries(position.tiles)) expect(tile.kind === 'station').toBe(hexAt(key).stationSite !== null)
  })

  it('connects every tile to a town, and keeps the towns apart except where the example merges them', () => {
    expect(citiesOf(state)).toHaveLength(name === 'merger' ? 4 : 5)
  })

  it('never overfills a Residence', () => {
    for (const tile of Object.values(state.tiles)) {
      if (tile.kind === 'residence') expect(tile.people.length).toBeLessThanOrEqual(RESIDENCE_CAPACITY)
    }
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

  it('builds a Factory beside the rail and touching no Mine, worth 2 as its caption says', () => {
    expect(industryValue(state, 'factory', IMMIGRATION_EXAMPLE.placed)).toBe(2)
  })

  it('brings as many people as a Factory does, to the only Station in its city', () => {
    const stations = stationsInCity(state, cityAt(state, IMMIGRATION_EXAMPLE.placed))
    expect(stations).toHaveLength(1)
    expect(stations[0].tile.people).toHaveLength(DEFAULT_SETTINGS.arrivals.factory)
  })
})

describe('the housing example', () => {
  const state = stateOf(HOUSING_EXAMPLE.position)

  it('leaves nobody who could still be housed', () => {
    expect(housingMoves(beginHousing(state))).toEqual([])
  })

  it('moves people only within their city', () => {
    for (const { from, to } of HOUSING_EXAMPLE.moves) expect(cityAt(state, from)).toEqual(cityAt(state, to))
  })

  it('tags one cube for each person who moved in', () => {
    expect(HOUSING_EXAMPLE.bagTags.reduce((sum, tag) => sum + tag.amount, 0)).toBe(HOUSING_EXAMPLE.moves.length)
  })

  it('fills the Residences the arrows point to', () => {
    for (const { to, home } of HOUSING_EXAMPLE.moves) expect(peopleAt(state, to).length).toBeGreaterThan(home)
  })
})

describe('the School example', () => {
  const state = stateOf(SCHOOL_EXAMPLE.position)
  // The position is drawn after housing, so put the two people back where they came from.
  const before = withTiles(state, {
    [residenceSiteKey('C')]: { kind: 'residence', people: ['grey'] },
    [residenceSiteKey('B')]: { kind: 'residence', people: ['blue', 'pink', 'pink'] },
    [stationKeyOf('B')]: { kind: 'station', people: ['blue'] },
  })

  it('places the School where a School may go', () => {
    const { [SCHOOL_EXAMPLE.placed]: placed, ...rest } = before.tiles
    expect(placed).toEqual({ kind: 'school' })
    expect(legalPlacements({ ...before, tiles: rest }, 'school')).toContain(SCHOOL_EXAMPLE.placed)
  })

  it('makes each move one housing allows', () => {
    const moves = housingMoves(beginHousing(before))
    for (const { from, to } of SCHOOL_EXAMPLE.moves) expect(moves.some(move => move.from === from && move.to === to)).toBe(true)
  })

  it('takes people from another city, as its caption says', () => {
    for (const { from, to } of SCHOOL_EXAMPLE.moves) expect(cityAt(state, from)).not.toEqual(cityAt(state, to))
  })

  it('leaves nobody who could still be housed', () => {
    expect(housingMoves(beginHousing(state))).toEqual([])
  })

  it('tags one cube for each person moved in', () => {
    expect(SCHOOL_EXAMPLE.bagTags.reduce((sum, tag) => sum + tag.amount, 0)).toBe(SCHOOL_EXAMPLE.moves.length)
  })
})

describe('the merger example', () => {
  it('joins C to B', () => {
    const { own, joins } = citiesTouchedBy(stateOf(MERGER_EXAMPLE.position), MERGER_EXAMPLE.placed)
    expect([own, ...joins.map(join => join.city)].flat().sort()).toEqual(['B', 'C'])
  })
})

describe('the election example', () => {
  const { result } = ELECTION_EXAMPLE

  it('has 4 seats, the empty Residence belonging to nobody', () => {
    expect(result.seats).toHaveLength(4)
    expect(result.seats.filter(seat => seat.winner === null)).toHaveLength(1)
  })

  it('gives the tied Residence to Saffron, the colour furthest left', () => {
    expect(result.seats.filter(seat => seat.reason === 'leftmostOfTie').map(seat => seat.winner)).toEqual(['yellow'])
  })

  it('values the city at 7 and pays 2 per seat, as its caption says', () => {
    expect(result).toMatchObject({ cityValue: 7, pointsPerSeat: 2 })
  })

  it('has Cobalt score 4 and Saffron 2', () => {
    expect(result.scores).toEqual({ blue: 4, yellow: 2 })
  })
})
