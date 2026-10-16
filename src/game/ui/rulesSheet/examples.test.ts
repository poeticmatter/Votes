import { describe, expect, it } from 'vitest'
import { hexAt, isStationSiteInUse } from '../../map/board'
import { legalPlacements } from '../../rules/placement'
import { residencesNextTo } from '../../rules/relocation'
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

describe.each(POSITIONS)('the %s example', (_, position) => {
  it('puts tiles only on open hexes', () => {
    expect(Object.keys(position.tiles).every(key => hexAt(key).terrain === 'open')).toBe(true)
  })

  it('has Stations on station sites in use, and nothing else on them', () => {
    for (const [key, tile] of Object.entries(position.tiles)) {
      expect(tile.kind === 'station').toBe(isStationSiteInUse(hexAt(key), position.playerCount))
    }
  })

  it('overfills a Residence only beside a School', () => {
    const state = stateOf(position)
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
    const { kind } = candidate.tile
    expect(legalPlacements(state, kind).includes(candidate.at)).toBe(candidate.isAllowed)
  })
})

describe('the election example', () => {
  it('has Cobalt score the city’s 3 Factory points, as its caption says', () => {
    expect(ELECTION_EXAMPLE.result).toMatchObject({ scorers: ['blue'], factoryPoints: 3 })
  })

  it('lists E’s seats before C’s', () => {
    expect(ELECTION_EXAMPLE.result.seats.map(seat => hexAt(seat.residence).district)).toEqual(['E', 'E', 'E', 'C', 'C'])
  })
})
