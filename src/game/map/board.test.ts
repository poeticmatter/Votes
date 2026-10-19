import { describe, expect, it } from 'vitest'
import { BOARD, hexAt, RAIL_ORDER, residenceSiteKey, stationKeyOf, TOWN_IDS, townsOneStopAway } from './board'

describe('derived board', () => {
  it('has only open hexes and mountains', () => {
    expect(new Set(BOARD.hexes.map(hex => hex.terrain))).toEqual(new Set(['open', 'mountain']))
  })

  it('has mountains along the south edge below E', () => {
    expect(hexAt('6,7').terrain).toBe('mountain')
  })

  it('marks hexes beside the track as bordering a rail', () => {
    // [4, 1] is between B and A, where the rail runs south-west.
    expect(hexAt('4,1').bordersRail).toBe(true)
    expect(hexAt('5,2').bordersRail).toBe(false)
  })

  it('runs the rail down the west edge from A to D', () => {
    expect(hexAt('0,5').bordersRail).toBe(true)
  })
})

describe('town sites', () => {
  it('puts every Station beside its town’s Residence', () => {
    for (const town of TOWN_IDS) {
      const neighbors = hexAt(residenceSiteKey(town)).neighbors.map(neighbor => neighbor.key)
      expect(neighbors).toContain(stationKeyOf(town))
    }
  })

  it('puts every Station on the rail, where trains bring people', () => {
    expect(TOWN_IDS.every(town => hexAt(stationKeyOf(town)).bordersRail)).toBe(true)
  })

  it('ends the rail at D’s Station', () => {
    expect(hexAt(stationKeyOf('D')).railSides).toEqual(['NW'])
  })

  it('marks each site with its town', () => {
    expect(BOARD.hexes.filter(hex => hex.residenceSite).map(hex => hex.residenceSite).sort()).toEqual(TOWN_IDS)
    expect(BOARD.hexes.filter(hex => hex.stationSite).map(hex => hex.stationSite).sort()).toEqual(TOWN_IDS)
  })
})

describe('the rail’s stops', () => {
  it('passes the Stations in the order E, C, B, A, D', () => {
    expect(RAIL_ORDER).toEqual(['E', 'C', 'B', 'A', 'D'])
  })

  it('gives the middle towns two stops and each end of the rail one', () => {
    expect(TOWN_IDS.map(townsOneStopAway)).toEqual([['B', 'D'], ['C', 'A'], ['E', 'B'], ['A'], ['C']])
  })
})
