import { describe, expect, it } from 'vitest'
import { BOARD, hexAt, residenceSiteKey, stationKeyOf, TOWN_IDS } from './board'

describe('derived board', () => {
  it('has forest along the rail south of E', () => {
    expect(hexAt('6,7').terrain).toBe('forest')
  })

  it('marks hexes beside the track as bordering a rail', () => {
    // [5, 2] borders the north-south line.
    expect(hexAt('5,2').bordersRail).toBe(true)
    // [3, 1] only borders the river.
    expect(hexAt('3,1').bordersRail).toBe(false)
  })

  it('runs the western line along the lakeshore into D', () => {
    expect(hexAt('1,5').bordersRail).toBe(true)
    // The west edge of the map has no rail any more.
    expect(hexAt('0,4').bordersRail).toBe(false)
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

  it('ends the western line at D’s Station', () => {
    expect(hexAt(stationKeyOf('D')).railSides).toEqual(['NW'])
  })

  it('marks each site with its town', () => {
    expect(BOARD.hexes.filter(hex => hex.residenceSite).map(hex => hex.residenceSite).sort()).toEqual(TOWN_IDS)
    expect(BOARD.hexes.filter(hex => hex.stationSite).map(hex => hex.stationSite).sort()).toEqual(TOWN_IDS)
  })
})
