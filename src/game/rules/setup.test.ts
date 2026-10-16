import { describe, expect, it } from 'vitest'
import { countByColor } from './elections'
import { factoryKeys, peopleOnBoard, residences } from './boardQueries'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { INDEPENDENT, type VotesSettings } from './types'

const game = (playerCount: number, seed = 3) => createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
const threePlayers = (seed = 3) => game(3, seed)

describe('setup', () => {
  it('prints two Factories in district E', () => {
    expect(factoryKeys(threePlayers())).toEqual(['9,7', '10,7'])
  })

  it('seeds two people on every printed Residence', () => {
    expect(residences(threePlayers()).map(({ tile }) => tile.people.length)).toEqual([2, 2, 2, 2, 2])
  })

  it('seeds two of each player colour, topped up with grey to ten', () => {
    expect(countByColor(peopleOnBoard(threePlayers()))).toEqual({ pink: 2, vermillion: 2, blue: 2, [INDEPENDENT]: 4 })
  })

  it('bags two of each player colour and the grey cubes left over', () => {
    expect(threePlayers().bag).toEqual({ pink: 2, vermillion: 2, blue: 2, [INDEPENDENT]: 6 })
  })

  it('gives each player 3 Stations with 2 players and 2 with more', () => {
    expect([2, 3, 4, 5].map(count => game(count).players[0].stationsLeft)).toEqual([3, 2, 2, 2])
  })

  it('deals the seeded people differently for different seeds', () => {
    const dealOf = (seed: number) => residences(threePlayers(seed)).map(({ tile }) => tile.people)
    const deals = new Set([1, 2, 3, 4, 5].map(seed => JSON.stringify(dealOf(seed))))
    expect(deals.size).toBeGreaterThan(1)
  })

  it('refuses settings from a lobby running an older version', () => {
    const { arrivals: _, ...olderSettings } = DEFAULT_SETTINGS
    // An older lobby's settings lack fields the type requires, so only a cast can stand in for them.
    const settings = olderSettings as VotesSettings
    expect(() => createInitialState({ settings, playerCount: 3, seed: 1 })).toThrow('older version')
  })

  it('refuses too few grey cubes to seed the Residences', () => {
    expect(() => createInitialState({ settings: { ...DEFAULT_SETTINGS, greyCubes: 5 }, playerCount: 2, seed: 1 })).toThrow()
  })
})
