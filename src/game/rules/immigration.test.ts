import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { bagSize, cityAt, residencesInCity } from './boardQueries'
import { applyMove } from './turnFlow'
import { HOME, mountainNextToTile, NEXT, soloNeighborsOf, startOf } from './testMap'
import { newGame, residence, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// Pink, the active player, places a Factory beside HOME's tiles, which joins HOME's city.
// Every starting Residence starts empty. A bag of pink only keeps the draws certain, since
// each arrival also adds a pink cube to it.

const [factoryAt, secondHome] = soloNeighborsOf(HOME)
const placeFactory = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', at: factoryAt })

describe('a new Factory', () => {
  const board = withBag(newGame(), { pink: 5 })
  const arrived = placeFactory(board)

  it('draws 3 people from the bag into its city’s Residence', () => {
    expect(arrived.tiles[startOf(HOME)]).toEqual(residence(['pink', 'pink', 'pink']))
  })

  it('adds 1 of the active player’s cubes to the bag for each arrival', () => {
    expect(bagSize(arrived)).toBe(bagSize(board))
  })

  it('brings nobody to other cities', () => {
    expect(arrived.tiles[startOf(NEXT)]).toEqual(residence())
  })

  it('brings nobody from an empty bag', () => {
    expect(placeFactory(withBag(newGame(), {})).tiles[startOf(HOME)]).toEqual(residence())
  })

  it('brings as many people as the dial says', () => {
    const fewer = { ...withBag(newGame(), { pink: 5 }), arrivals: { factory: 1, mine: 3 } }
    expect(placeFactory(fewer).tiles[startOf(HOME)]).toEqual(residence(['pink']))
  })

  it('draws the same cubes from the same state', () => {
    const state = withBag(newGame(), { vermillion: 3, pink: 3, grey: 3 })
    expect(placeFactory(state).tiles).toEqual(placeFactory(state).tiles)
  })

  it('records each arrival and who earned its cube', () => {
    const arrivals = arrived.log.filter(entry => entry.kind === 'arrived')
    expect(arrivals).toHaveLength(3)
    expect(arrivals[0]).toMatchObject({ color: 'pink', residence: startOf(HOME), voter: 'pink' })
  })
})

describe('arrivals in a city with several Residences', () => {
  // HOME's starting Residence is empty and a second one holds a grey person.
  const board = withBag(withTiles(newGame(), { [secondHome]: residence(['grey']) }), { pink: 5 })
  const choosing = placeFactory(board)

  it('sends each person to the least crowded Residence', () => {
    expect(choosing.tiles[startOf(HOME)]).toEqual(residence(['pink']))
  })

  it('lets the player choose between Residences tied for least crowded', () => {
    expect(choosing.phase).toMatchObject({ kind: 'arrival', person: 'pink', remaining: 1 })
    expect(choosing.phase.kind === 'arrival' && [...choosing.phase.residences].sort()).toEqual([startOf(HOME), secondHome].sort())
  })

  it('moves the person into the Residence chosen, then rechecks for the next', () => {
    const chosen = applyMove(choosing, { kind: 'arrive', residence: secondHome })
    expect(chosen.tiles[secondHome]).toEqual(residence(['grey', 'pink']))
    expect(chosen.tiles[startOf(HOME)]).toEqual(residence(['pink', 'pink']))
  })

  it('refuses a Residence that isn’t tied for least crowded', () => {
    expect(() => applyMove(choosing, { kind: 'arrive', residence: startOf(NEXT) })).toThrow(IllegalMoveError)
  })
})

describe('a new Mine', () => {
  const mineAt = mountainNextToTile()
  const arrived = applyMove(withBag(newGame(), { pink: 5 }), { kind: 'place', tile: 'mine', at: mineAt })

  it('draws 3 people from the bag into its city, like a Factory', () => {
    const [own] = residencesInCity(arrived, cityAt(arrived, mineAt))
    expect(own.tile).toEqual(residence(['pink', 'pink', 'pink']))
  })
})

describe('other tiles', () => {
  it('bring nobody', () => {
    const state = applyMove(withBag(newGame(), { pink: 5 }), { kind: 'place', tile: 'school', at: factoryAt })
    expect(state.tiles[startOf(HOME)]).toEqual(residence())
  })
})
