import { describe, expect, it } from 'vitest'
import { residenceSiteKey, TOWN_IDS } from '../map/board'
import { STARTING_FACTORIES } from '../map/mapData'
import { countByColor } from './elections'
import { citiesOf, peopleOnBoard, residences, tilesInBoardOrder } from './boardQueries'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { INDEPENDENT, type VotesSettings } from './types'

const game = (playerCount: number, seed = 3) => createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
const threePlayers = (seed = 3) => game(3, seed)

describe('setup', () => {
  it('puts a starting Residence in every town, and the printed Factories, and nothing else', () => {
    const towns = TOWN_IDS.map(residenceSiteKey)
    const factories = STARTING_FACTORIES.map(([col, row]) => `${col},${row}`)
    expect(tilesInBoardOrder(threePlayers()).map(({ key }) => key).sort()).toEqual([...towns, ...factories].sort())
  })

  it('starts each printed Factory in the city it touches', () => {
    const state = threePlayers()
    for (const [col, row] of STARTING_FACTORIES) expect(state.tiles[`${col},${row}`]).toEqual({ kind: 'factory' })
    expect(citiesOf(state)).toHaveLength(TOWN_IDS.length)
  })

  it('starts every town as a city of its own', () => {
    expect(citiesOf(threePlayers())).toEqual(TOWN_IDS.map(town => [town]))
  })

  it('seeds two people on every starting Residence', () => {
    expect(residences(threePlayers()).map(({ tile }) => tile.people.length)).toEqual([2, 2, 2, 2, 2])
  })

  it('seeds two of each player colour, topped up with grey to ten', () => {
    expect(countByColor(peopleOnBoard(threePlayers()))).toEqual({ pink: 2, vermillion: 2, blue: 2, [INDEPENDENT]: 4 })
  })

  it('seeds four grey people with three players and none with five', () => {
    expect(countByColor(peopleOnBoard(threePlayers()))[INDEPENDENT]).toBe(4)
    expect(countByColor(peopleOnBoard(game(5)))[INDEPENDENT]).toBeUndefined()
  })

  it('bags two cubes of each player colour and the grey cubes left over', () => {
    expect(threePlayers().bag).toEqual({ pink: 2, vermillion: 2, blue: 2, [INDEPENDENT]: 6 })
    expect(game(5).bag[INDEPENDENT]).toBe(10)
  })

  it('starts with the full tile supply', () => {
    expect(threePlayers().supply).toEqual(DEFAULT_SETTINGS.tileCounts)
  })

  it('refuses two players', () => {
    expect(() => game(2)).toThrow('3–5 players')
  })

  it('deals the seeded people differently for different seeds', () => {
    const dealOf = (seed: number) => residences(threePlayers(seed)).map(({ tile }) => tile.people)
    const deals = new Set([1, 2, 3, 4, 5].map(seed => JSON.stringify(dealOf(seed))))
    expect(deals.size).toBeGreaterThan(1)
  })

  it('refuses settings from a lobby running an older version', () => {
    // Draft 5.8's dials, which lack this version's; the cast stands in for a lobby the types can't see.
    const older = { startingCubesPerPlayer: 4, factoryArrivals: 3 } as unknown as VotesSettings
    expect(() => createInitialState({ settings: older, playerCount: 3, seed: 1 })).toThrow('older version')
  })
})
