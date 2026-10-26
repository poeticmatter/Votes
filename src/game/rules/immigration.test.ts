import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { bagSize, cityAt, stationsInCity } from './boardQueries'
import { applyMove } from './turnFlow'
import { chainBetween, chainWithGap, HOME, mountainNextToTile, must, NEXT, soloNeighborOf, stationOf } from './testMap'
import { crowdedTowns, newGame, school, station, tilesOn, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// Pink, the active player, places a Factory beside HOME's tiles, which joins HOME's city.
// Every starting Residence is full, so nobody can be housed and the people stay at
// HOME's Station.

const factoryAt = soloNeighborOf(HOME)
const crowded = withTiles(newGame(), crowdedTowns())
const placeFactory = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', at: factoryAt })

describe('a new Factory', () => {
  const board = withBag(crowded, { vermillion: 5 })
  const arrived = placeFactory(board)

  it('draws 3 people from the bag onto its city’s Station', () => {
    expect(arrived.tiles[stationOf(HOME)]).toEqual(station(['vermillion', 'vermillion', 'vermillion']))
  })

  it('takes them out of the bag', () => {
    expect(bagSize(arrived)).toBe(bagSize(board) - 3)
  })

  it('brings nobody to other cities’ Stations', () => {
    expect(arrived.tiles[stationOf(NEXT)]).toEqual(station())
  })

  it('brings only as many as the bag holds', () => {
    expect(placeFactory(withBag(crowded, { pink: 2 })).tiles[stationOf(HOME)]).toEqual(station(['pink', 'pink']))
  })

  it('brings nobody from an empty bag', () => {
    expect(placeFactory(withBag(crowded, {})).tiles[stationOf(HOME)]).toEqual(station())
  })

  it('draws the same cubes from the same state', () => {
    const state = withBag(crowded, { vermillion: 3, pink: 3, grey: 3 })
    expect(placeFactory(state).tiles).toEqual(placeFactory(state).tiles)
  })

  it('can bring grey people, who are in the bag too', () => {
    expect(placeFactory(withBag(crowded, { grey: 3 })).tiles[stationOf(HOME)]).toEqual(station(['grey', 'grey', 'grey']))
  })

  it('brings as many people as the dial says', () => {
    const fewer = { ...withBag(crowded, { pink: 5 }), arrivals: { factory: 1, mine: 3 } }
    expect(placeFactory(fewer).tiles[stationOf(HOME)]).toEqual(station(['pink']))
  })
})

describe('a new Mine', () => {
  const mineAt = mountainNextToTile()
  const arrived = applyMove(withBag(crowded, { vermillion: 5 }), { kind: 'place', tile: 'mine', at: mineAt })

  it('draws 3 people from the bag onto its city’s Station', () => {
    const [own] = stationsInCity(arrived, cityAt(arrived, mineAt))
    expect(own.tile).toEqual(station(['vermillion', 'vermillion', 'vermillion']))
  })
})

describe('other tiles', () => {
  it('bring nobody', () => {
    const state = applyMove(withBag(crowded, { pink: 5 }), { kind: 'place', tile: 'residence', at: factoryAt })
    expect(state.tiles[stationOf(HOME)]).toEqual(station())
  })
})

describe('a Factory in a city with two Stations', () => {
  // A chain of Schools joins HOME and NEXT once a Factory fills its gap. Every starting
  // Residence is full, so nobody can be housed and the arrival stays visible.
  const { filled, gap } = chainWithGap(chainBetween(HOME, NEXT))
  const joined = withBag(withTiles(newGame(), { ...crowdedTowns(), ...tilesOn(filled, school) }), { vermillion: 6 })
  const choosing = applyMove(joined, { kind: 'place', tile: 'factory', at: gap })

  it('lets the player choose the Station', () => {
    expect(choosing.phase).toMatchObject({ kind: 'immigration' })
    expect(choosing.phase.kind === 'immigration' && [...choosing.phase.stations].sort()).toEqual([stationOf(HOME), stationOf(NEXT)].sort())
  })

  it('brings the people to the Station chosen', () => {
    const arrived = applyMove(choosing, { kind: 'arrive', station: stationOf(NEXT) })
    expect(arrived.tiles[stationOf(NEXT)]).toEqual(station(['vermillion', 'vermillion', 'vermillion']))
    expect(arrived.tiles[stationOf(HOME)]).toEqual(station())
  })

  it('refuses a Station outside the city', () => {
    const outside = newGame().tiles
    const farStation = Object.keys(outside).find(key => outside[key].kind === 'station' && key !== stationOf(HOME) && key !== stationOf(NEXT))
    expect(() => applyMove(choosing, { kind: 'arrive', station: must(farStation, 'third Station') })).toThrow(IllegalMoveError)
  })
})
