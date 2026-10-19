import { describe, expect, it } from 'vitest'
import { hexAt, stationKeyOf, townsOneStopAway } from '../../map/board'
import { citiesOf, cityAt, factoryPoints, peopleAt, stationsInCity } from '../../rules/boardQueries'
import { beginHousing, housingMoves } from '../../rules/housing'
import { citiesTouchedBy } from '../../rules/mergers'
import { legalPlacements } from '../../rules/placement'
import { eligibleResidences } from '../../rules/relocation'
import { DEFAULT_SETTINGS } from '../../rules/setup'
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

const C_STATION = stationKeyOf('C')
const E_NEW_RESIDENCE = HOUSING_EXAMPLE.moves[0].to

const POSITIONS: [string, ExamplePosition][] = [
  ['placement', PLACEMENT_EXAMPLE.position],
  ['immigration', IMMIGRATION_EXAMPLE.position],
  ['housing', HOUSING_EXAMPLE.position],
  ['school', SCHOOL_EXAMPLE.position],
  ['merger', MERGER_EXAMPLE.position],
]

describe.each(POSITIONS)('the %s example', (name, position) => {
  const state = stateOf(position)

  it('puts tiles only on open hexes', () => {
    expect(Object.keys(position.tiles).every(key => hexAt(key).terrain === 'open')).toBe(true)
  })

  it('has Stations only where they are printed', () => {
    for (const [key, tile] of Object.entries(position.tiles)) expect(tile.kind === 'station').toBe(hexAt(key).stationSite !== null)
  })

  it('connects every tile to a town, and keeps the towns apart except where the example merges them', () => {
    expect(citiesOf(state)).toHaveLength(name === 'merger' ? 4 : 5)
  })

  it('overfills a Residence only beside a School', () => {
    const schools = Object.keys(state.tiles).filter(key => state.tiles[key].kind === 'school')
    for (const [key, tile] of Object.entries(state.tiles)) {
      if (tile.kind !== 'residence' || tile.people.length <= RESIDENCE_CAPACITY) continue
      expect(schools.some(school => eligibleResidences(state, school).includes(key))).toBe(true)
    }
  })
})

describe('the placement example', () => {
  const state = stateOf(PLACEMENT_EXAMPLE.position)

  it.each(PLACEMENT_EXAMPLE.candidates)('marks candidate $number allowed only if the rules allow it', candidate => {
    expect(legalPlacements(state).includes(candidate.at)).toBe(candidate.isAllowed)
  })
})

describe('the immigration example', () => {
  const state = stateOf(IMMIGRATION_EXAMPLE.position)

  it('builds a Factory beside the rail, worth 2 points as its caption says', () => {
    expect(factoryPoints(IMMIGRATION_EXAMPLE.placed)).toBe(2)
  })

  it('brings as many people as a Factory does, to the only Station in its city', () => {
    const stations = stationsInCity(state, cityAt(state, IMMIGRATION_EXAMPLE.placed))
    expect(stations).toHaveLength(1)
    expect(stations[0].tile.people).toHaveLength(DEFAULT_SETTINGS.factoryArrivals)
  })
})

describe('the housing example', () => {
  const state = stateOf(HOUSING_EXAMPLE.position)

  it('leaves nobody who could still be housed', () => {
    expect(housingMoves(beginHousing(state))).toEqual([])
  })

  it('moves people in from a neighboring city, as its caption says', () => {
    expect(townsOneStopAway('C')).toContain('E')
    expect(cityAt(state, C_STATION)).not.toEqual(cityAt(state, E_NEW_RESIDENCE))
  })

  it('tags one cube for each person who moved in from within the city, and none for a neighboring city', () => {
    const local = HOUSING_EXAMPLE.moves.filter(move => cityAt(state, move.from)[0] === cityAt(state, move.to)[0])
    expect(HOUSING_EXAMPLE.bagTags.reduce((sum, tag) => sum + tag.amount, 0)).toBe(local.length)
    expect(local).toHaveLength(1)
  })

  it('fills the Residences the arrows point to', () => {
    for (const { to, home } of HOUSING_EXAMPLE.moves) expect(peopleAt(state, to).length).toBeGreaterThan(home)
  })
})

describe('the School example', () => {
  const state = stateOf(SCHOOL_EXAMPLE.position)

  it('leaves out the Residence that touches another School, as its caption says', () => {
    const eligible = eligibleResidences(state, SCHOOL_EXAMPLE.placed)
    expect(eligible).toHaveLength(2)
    expect(eligible).not.toContain(SCHOOL_EXAMPLE.blocked)
  })

  it('moves the one person into an eligible Residence', () => {
    const [{ to }] = SCHOOL_EXAMPLE.moves
    expect(eligibleResidences(state, SCHOOL_EXAMPLE.placed)).toContain(to)
  })

  it('tags one cube for the person moved in', () => {
    expect(SCHOOL_EXAMPLE.bagTags.reduce((sum, tag) => sum + tag.amount, 0)).toBe(SCHOOL_EXAMPLE.moves.length)
  })
})

describe('the merger example', () => {
  it('joins C to E on the marked edge', () => {
    const { own, joins } = citiesTouchedBy(stateOf(MERGER_EXAMPLE.position), MERGER_EXAMPLE.placed)
    expect(own).toEqual(['E'])
    expect(joins).toEqual([{ city: ['C'], between: MERGER_EXAMPLE.marker.between }])
  })
})

describe('the election example', () => {
  it('has Cobalt score the city’s 4 Factory points, as its caption says', () => {
    expect(ELECTION_EXAMPLE.result).toMatchObject({ scorers: ['blue'], factoryPoints: 4 })
  })

  it('has 4 seats, the empty Residence counting for nobody', () => {
    expect(ELECTION_EXAMPLE.result.seats).toHaveLength(4)
    expect(ELECTION_EXAMPLE.result.seats.filter(seat => seat.winner === null)).toHaveLength(1)
  })

  it('gives the tied Residence to Saffron, the colour furthest left', () => {
    expect(ELECTION_EXAMPLE.result.seats.filter(seat => seat.reason === 'leftmostOfTie').map(seat => seat.winner)).toEqual(['yellow'])
  })
})
