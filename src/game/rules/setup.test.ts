import { describe, expect, it } from 'vitest'
import { residenceSiteKey, stationKeyOf, TOWN_IDS } from '../map/board'
import { countByColor } from './elections'
import { peopleOnBoard, residences, stations, tilesInBoardOrder } from './boardQueries'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { INDEPENDENT, type VotesSettings } from './types'

const game = (playerCount: number, seed = 3) => createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
const threePlayers = (seed = 3) => game(3, seed)

describe('setup', () => {
  it('puts a starting Residence and a Station in every town, and nothing else', () => {
    const expected = TOWN_IDS.flatMap(town => [residenceSiteKey(town), stationKeyOf(town)]).sort()
    expect(tilesInBoardOrder(threePlayers()).map(({ key }) => key).sort()).toEqual(expected)
  })

  it('deals the town colours two, two and one', () => {
    const counts = Object.values(countColors(threePlayers().townColors)).sort()
    expect(counts).toEqual([1, 2, 2])
  })

  it('draws every town’s tiles in its colour', () => {
    const state = threePlayers()
    expect(tilesInBoardOrder(state).every(({ tile }) => tile.color === state.townColors[tile.town])).toBe(true)
  })

  it('deals the town colours differently for different seeds', () => {
    const deals = new Set([1, 2, 3, 4, 5, 6].map(seed => JSON.stringify(threePlayers(seed).townColors)))
    expect(deals.size).toBeGreaterThan(1)
  })

  it('seeds two people on every starting Residence and nobody at the Stations', () => {
    const state = threePlayers()
    expect(residences(state).map(({ tile }) => tile.people.length)).toEqual([2, 2, 2, 2, 2])
    expect(stations(state).every(({ tile }) => tile.people.length === 0)).toBe(true)
  })

  it('seeds two of each player colour, topped up with grey to ten', () => {
    expect(countByColor(peopleOnBoard(threePlayers()))).toEqual({ pink: 2, vermillion: 2, blue: 2, [INDEPENDENT]: 4 })
  })

  it('bags two of each player colour and the grey cubes left over', () => {
    expect(threePlayers().bag).toEqual({ pink: 2, vermillion: 2, blue: 2, [INDEPENDENT]: 6 })
  })

  it('refuses settings from a lobby running an older version', () => {
    const { factoryArrivals: _, ...olderSettings } = DEFAULT_SETTINGS
    // An older lobby's settings lack fields the type requires, so only a cast can stand in for them.
    const settings = olderSettings as VotesSettings
    expect(() => createInitialState({ settings, playerCount: 3, seed: 1 })).toThrow('older version')
  })

  it('refuses too few grey cubes to seed the Residences', () => {
    expect(() => createInitialState({ settings: { ...DEFAULT_SETTINGS, greyCubes: 5 }, playerCount: 2, seed: 1 })).toThrow()
  })
})

function countColors(townColors: Record<string, string>): Record<string, number> {
  return Object.values(townColors).reduce<Record<string, number>>((counts, color) => ({ ...counts, [color]: (counts[color] ?? 0) + 1 }), {})
}
