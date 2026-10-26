import { describe, expect, it } from 'vitest'
import { BOARD, hexAt, residenceSiteKey, stationKeyOf, TOWN_IDS } from './board'
import { STARTING_FACTORIES } from './mapData'

describe('derived board', () => {
  it('has only open hexes and mountains', () => {
    expect(new Set(BOARD.hexes.map(hex => hex.terrain))).toEqual(new Set(['open', 'mountain']))
  })

  it('marks hexes beside the track as bordering a rail, and others as not', () => {
    expect(BOARD.hexes.some(hex => hex.bordersRail)).toBe(true)
    expect(BOARD.hexes.some(hex => hex.terrain === 'open' && !hex.bordersRail)).toBe(true)
  })

  it('never lists a mountain as bordering a rail', () => {
    expect(BOARD.hexes.filter(hex => hex.terrain === 'mountain').every(hex => !hex.bordersRail)).toBe(true)
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

  it('marks each site with its town', () => {
    expect(BOARD.hexes.filter(hex => hex.residenceSite).map(hex => hex.residenceSite).sort()).toEqual(TOWN_IDS)
    expect(BOARD.hexes.filter(hex => hex.stationSite).map(hex => hex.stationSite).sort()).toEqual(TOWN_IDS)
  })
})

describe('printed Factories', () => {
  it('are marked on their hexes, and nowhere else', () => {
    const marked = BOARD.hexes.filter(hex => hex.hasStartingFactory).map(hex => hex.key)
    expect(marked.sort()).toEqual(STARTING_FACTORIES.map(([col, row]) => `${col},${row}`).sort())
  })

  it('sit beside a town’s Residence or Station, so they start in a city', () => {
    for (const hex of BOARD.hexes.filter(candidate => candidate.hasStartingFactory)) {
      expect(hex.neighbors.some(neighbor => hexAt(neighbor.key).residenceSite || hexAt(neighbor.key).stationSite)).toBe(true)
    }
  })
})
