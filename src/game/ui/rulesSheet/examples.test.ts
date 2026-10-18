import { describe, expect, it } from 'vitest'
import { hexAt, residenceSiteKey } from '../../map/board'
import type { HexKey } from '../../map/hexGrid'
import { peopleAt } from '../../rules/boardQueries'
import { beginHousing, housingMoves } from '../../rules/housing'
import { citiesJoinedBy } from '../../rules/mergers'
import { legalPlacements } from '../../rules/placement'
import { residencesNextTo, schoolVotes } from '../../rules/relocation'
import { DEFAULT_SETTINGS } from '../../rules/setup'
import { RESIDENCE_CAPACITY, type VotesState } from '../../rules/types'
import {
  ELECTION_EXAMPLE,
  EXAMPLE_TOWN_COLORS,
  HOUSING_EXAMPLE,
  IMMIGRATION_EXAMPLE,
  MERGER_EXAMPLE,
  PLACEMENT_EXAMPLE,
  SCHOOL_EXAMPLE,
  stateOf,
  type ExamplePosition,
} from './examples'

// The rules sheet's examples must show what the game's rules actually do.

/** Hexes `key` reaches through tiles of its own town. */
function townReach(state: VotesState, key: HexKey): Set<HexKey> {
  const town = state.tiles[key].town
  const reached = new Set([key])
  const pending = [key]
  while (pending.length) {
    for (const { key: next } of hexAt(pending.pop()!).neighbors) {
      if (state.tiles[next]?.town !== town || reached.has(next)) continue
      reached.add(next)
      pending.push(next)
    }
  }
  return reached
}

/** Pairs of touching tiles from different towns, each pair once. */
function townBorders(state: VotesState): [HexKey, HexKey][] {
  return Object.keys(state.tiles).flatMap(key =>
    hexAt(key)
      .neighbors.filter(({ key: other }) => key < other && state.tiles[other] && state.tiles[other].town !== state.tiles[key].town)
      .map(({ key: other }): [HexKey, HexKey] => [key, other]),
  )
}

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

  it('draws every tile in its town’s colour', () => {
    expect(Object.values(position.tiles).every(tile => tile.color === EXAMPLE_TOWN_COLORS[tile.town])).toBe(true)
  })

  it('connects every tile to its town’s starting Residence', () => {
    for (const [key, tile] of Object.entries(position.tiles)) expect(townReach(state, key).has(residenceSiteKey(tile.town))).toBe(true)
  })

  it('has towns touch only where the example merges them', () => {
    const merging = name === 'merger' ? [MERGER_EXAMPLE.marker.between] : []
    const sorted = (pair: [HexKey, HexKey]) => [...pair].sort()
    expect(townBorders(state).map(sorted)).toEqual(merging.map(sorted))
  })

  it('overfills a Residence only beside a School', () => {
    const schools = Object.keys(state.tiles).filter(key => state.tiles[key].kind === 'school')
    for (const [key, tile] of Object.entries(state.tiles)) {
      if (tile.kind !== 'residence' || tile.people.length <= RESIDENCE_CAPACITY) continue
      expect(schools.some(school => residencesNextTo(state, school).includes(key))).toBe(true)
    }
  })
})

describe('the placement example', () => {
  const state = stateOf(PLACEMENT_EXAMPLE.position)

  it.each(PLACEMENT_EXAMPLE.candidates)('marks candidate $number allowed only if the rules allow it', candidate => {
    expect(legalPlacements(state, candidate.color).includes(candidate.at)).toBe(candidate.isAllowed)
  })

  it('has candidate 3 merge A and B, as its reason says', () => {
    expect(citiesJoinedBy(state, 'B', '2,4').map(join => join.city)).toEqual([['A']])
  })
})

describe('the immigration example', () => {
  it('brings as many people as a Factory does', () => {
    expect(peopleAt(stateOf(IMMIGRATION_EXAMPLE.position), '7,6')).toHaveLength(DEFAULT_SETTINGS.factoryArrivals)
  })
})

describe('the housing example', () => {
  it('leaves nobody who could still be housed', () => {
    expect(housingMoves(beginHousing(stateOf(HOUSING_EXAMPLE.position)))).toEqual([])
  })
})

describe('the School example', () => {
  it('earns the School’s own vote for one Residence, as its caption says', () => {
    expect(schoolVotes(stateOf(SCHOOL_EXAMPLE.position), SCHOOL_EXAMPLE.placed)).toBe(1)
  })

  it('tags one cube per person moved plus the School’s own vote', () => {
    const tagged = SCHOOL_EXAMPLE.bagTags.reduce((sum, tag) => sum + tag.amount, 0)
    expect(tagged).toBe(SCHOOL_EXAMPLE.moves.length + 1)
  })
})

describe('the merger example', () => {
  it('joins C to E on the marked edge', () => {
    const joins = citiesJoinedBy(stateOf(MERGER_EXAMPLE.position), 'C', MERGER_EXAMPLE.placed)
    expect(joins).toEqual([{ city: ['E'], between: MERGER_EXAMPLE.marker.between }])
  })
})

describe('the election example', () => {
  it('has Cobalt score the city’s 3 Factory points, as its caption says', () => {
    expect(ELECTION_EXAMPLE.result).toMatchObject({ scorers: ['blue'], factoryPoints: 3 })
  })

  it('lists C’s seats before E’s', () => {
    expect(ELECTION_EXAMPLE.result.seats.map(seat => seat.town)).toEqual(['C', 'C', 'E', 'E', 'E'])
  })
})
