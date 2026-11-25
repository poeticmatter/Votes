import { describe, expect, it } from 'vitest'
import { residenceSiteKey, TOWN_IDS } from '../map/board'
import { hexKey } from '../map/hexGrid'
import { STARTING_FACTORIES } from '../map/mapData'
import { countByColor } from './elections'
import { citiesOf, factories, peopleOnBoard, residences, tilesInBoardOrder } from './boardQueries'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { INDEPENDENT, type VotesSettings, type VotesState } from './types'

const game = (playerCount: number, seed = 3) => createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
const threePlayers = (seed = 3) => game(3, seed)
const factoryCubes = (state: VotesState) => factories(state).flatMap(({ tile }) => tile.cubes)

describe('setup', () => {
  it('puts a starting Residence in every town and the printed Factories, and nothing else', () => {
    const towns = TOWN_IDS.map(residenceSiteKey)
    const printed = STARTING_FACTORIES.map(([col, row]) => hexKey(col, row))
    expect(tilesInBoardOrder(threePlayers()).map(({ key }) => key).sort()).toEqual([...towns, ...printed].sort())
  })

  it('leaves every starting tile owned by nobody', () => {
    expect(Object.values(threePlayers().tiles).every(tile => tile.kind !== 'school' && tile.owner === null)).toBe(true)
  })

  it('starts every town as a city of its own', () => {
    expect(citiesOf(threePlayers())).toEqual(TOWN_IDS.map(town => [town]))
  })

  it('deals two people onto every starting Residence and five cubes onto every printed Factory', () => {
    expect(residences(threePlayers()).map(({ tile }) => tile.people.length)).toEqual([2, 2, 2, 2, 2])
    expect(factories(threePlayers()).map(({ tile }) => tile.cubes.length)).toEqual([5, 5])
  })

  it('deals two of each player colour onto the Residences, and two more onto the Factories, topped up with grey', () => {
    const dealt = { pink: 2, vermillion: 2, blue: 2, [INDEPENDENT]: 4 }
    expect(countByColor(peopleOnBoard(threePlayers()))).toEqual(dealt)
    expect(countByColor(factoryCubes(threePlayers()))).toEqual(dealt)
  })

  it('deals no grey with five players', () => {
    expect(countByColor([...peopleOnBoard(game(5)), ...factoryCubes(game(5))])[INDEPENDENT]).toBeUndefined()
  })

  it('bags four cubes of each player colour, topped up with grey to twenty', () => {
    expect(threePlayers().bag).toEqual({ pink: 4, vermillion: 4, blue: 4, [INDEPENDENT]: 8 })
    expect(game(5).bag[INDEPENDENT]).toBeUndefined()
  })

  it('gives every player their own tiles', () => {
    expect(threePlayers().players.map(player => player.supply)).toEqual(Array(3).fill({ residence: 15, factory: 5, school: 1 }))
  })

  it('refuses two players', () => {
    expect(() => game(2)).toThrow('3–5 players')
  })

  it('deals the cubes differently for different seeds', () => {
    const dealOf = (seed: number) => JSON.stringify([residences(threePlayers(seed)).map(({ tile }) => tile.people), factoryCubes(threePlayers(seed))])
    expect(new Set([1, 2, 3, 4, 5].map(dealOf)).size).toBeGreaterThan(1)
  })

  it('refuses settings from a lobby running an older version', () => {
    // The previous version's dials, which lack this one's; the cast stands in for a lobby the types can't see.
    const older = { startingCubesPerPlayer: 10, greyCubes: 10, tileCounts: { residence: 15, factory: 10, school: 5 } } as unknown as VotesSettings
    expect(() => createInitialState({ settings: older, playerCount: 3, seed: 1 })).toThrow('older version')
  })
})
