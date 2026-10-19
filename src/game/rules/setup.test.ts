import { describe, expect, it } from 'vitest'
import { residenceSiteKey, stationKeyOf, TOWN_IDS } from '../map/board'
import { countByColor } from './elections'
import { citiesOf, peopleOnBoard, residences, stations, tilesInBoardOrder } from './boardQueries'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { INDEPENDENT, type VotesSettings } from './types'

const game = (playerCount: number, seed = 3) => createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
const threePlayers = (seed = 3) => game(3, seed)

describe('setup', () => {
  it('puts a starting Residence and a Station in every town, and nothing else', () => {
    const expected = TOWN_IDS.flatMap(town => [residenceSiteKey(town), stationKeyOf(town)]).sort()
    expect(tilesInBoardOrder(threePlayers()).map(({ key }) => key).sort()).toEqual(expected)
  })

  it('starts every town as a city of its own', () => {
    expect(citiesOf(threePlayers())).toEqual(TOWN_IDS.map(town => [town]))
  })

  it('seeds two people on every starting Residence and nobody at the Stations', () => {
    const state = threePlayers()
    expect(residences(state).map(({ tile }) => tile.people.length)).toEqual([2, 2, 2, 2, 2])
    expect(stations(state).every(({ tile }) => tile.people.length === 0)).toBe(true)
  })

  it('seeds two of each player colour, topped up with grey to ten', () => {
    expect(countByColor(peopleOnBoard(threePlayers()))).toEqual({ pink: 2, vermillion: 2, blue: 2, [INDEPENDENT]: 4 })
  })

  it('seeds six grey people with two players and none with five', () => {
    expect(countByColor(peopleOnBoard(game(2)))[INDEPENDENT]).toBe(6)
    expect(countByColor(peopleOnBoard(game(5)))[INDEPENDENT]).toBeUndefined()
  })

  it('bags four cubes of each player colour and no grey', () => {
    expect(threePlayers().bag).toEqual({ pink: 4, vermillion: 4, blue: 4 })
  })

  it('deals the seeded people differently for different seeds', () => {
    const dealOf = (seed: number) => residences(threePlayers(seed)).map(({ tile }) => tile.people)
    const deals = new Set([1, 2, 3, 4, 5].map(seed => JSON.stringify(dealOf(seed))))
    expect(deals.size).toBeGreaterThan(1)
  })

  it('refuses settings from a lobby running an older version', () => {
    // An older lobby's settings have a dial this version dropped, which the type forbids.
    const settings = { ...DEFAULT_SETTINGS, greyCubes: 10 } as VotesSettings
    expect(() => createInitialState({ settings, playerCount: 3, seed: 1 })).toThrow('older version')
  })
})
