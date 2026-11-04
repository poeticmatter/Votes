import { describe, expect, it } from 'vitest'
import { BOARD, hexAt, TOWN_IDS } from './board'
import { STARTING_FACTORIES } from './mapData'

describe('derived board', () => {
  it('has only open hexes and mountains', () => {
    expect(new Set(BOARD.hexes.map(hex => hex.terrain))).toEqual(new Set(['open', 'mountain']))
  })
})

describe('town sites', () => {
  it('marks each starting Residence with its town', () => {
    expect(BOARD.hexes.filter(hex => hex.residenceSite).map(hex => hex.residenceSite).sort()).toEqual(TOWN_IDS)
  })

  it('puts every starting Residence on an open hex', () => {
    expect(BOARD.hexes.filter(hex => hex.residenceSite).every(hex => hex.terrain === 'open')).toBe(true)
  })
})

describe('printed Factories', () => {
  it('are marked on their hexes, and nowhere else', () => {
    const marked = BOARD.hexes.filter(hex => hex.hasStartingFactory).map(hex => hex.key)
    expect(marked.sort()).toEqual(STARTING_FACTORIES.map(([col, row]) => `${col},${row}`).sort())
  })

  it('sit beside a town’s starting Residence, so they start in a city', () => {
    for (const hex of BOARD.hexes.filter(candidate => candidate.hasStartingFactory)) {
      expect(hex.neighbors.some(neighbor => hexAt(neighbor.key).residenceSite)).toBe(true)
    }
  })
})
