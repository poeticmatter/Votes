import { describe, expect, it } from 'vitest'
import { familiesOnBoard, factoryKeys, residences } from './boardQueries'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { INDEPENDENT, type CubeColor } from './types'

const threePlayers = (seed = 3) => createInitialState({ settings: DEFAULT_SETTINGS, playerCount: 3, seed })

function countByColor(cubes: CubeColor[]): Partial<Record<CubeColor, number>> {
  return cubes.reduce<Partial<Record<CubeColor, number>>>((counts, color) => ({ ...counts, [color]: (counts[color] ?? 0) + 1 }), {})
}

describe('setup', () => {
  it('prints two Factories in district E', () => {
    expect(factoryKeys(threePlayers())).toEqual(['9,7', '10,7'])
  })

  it('seeds two families on every printed Residence', () => {
    expect(residences(threePlayers()).map(({ tile }) => tile.families.length)).toEqual([2, 2, 2, 2, 2])
  })

  it('seeds two of each player colour, topped up with grey to ten', () => {
    expect(countByColor(familiesOnBoard(threePlayers()))).toEqual({ vermillion: 2, blue: 2, yellow: 2, [INDEPENDENT]: 4 })
  })

  it('bags two of each player colour and the grey cubes left over', () => {
    expect(threePlayers().bag).toEqual({ vermillion: 2, blue: 2, yellow: 2, [INDEPENDENT]: 6 })
  })

  it('deals the seeded families differently for different seeds', () => {
    const dealOf = (seed: number) => residences(threePlayers(seed)).map(({ tile }) => tile.families)
    const deals = new Set([1, 2, 3, 4, 5].map(seed => JSON.stringify(dealOf(seed))))
    expect(deals.size).toBeGreaterThan(1)
  })

  it('refuses too few grey cubes to seed the Residences', () => {
    expect(() => createInitialState({ settings: { ...DEFAULT_SETTINGS, greyCubes: 5 }, playerCount: 2, seed: 1 })).toThrow()
  })
})
