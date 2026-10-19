import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { bagSize } from './boardQueries'
import { applyMove } from './turnFlow'
import { newGame, residence, school, station, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// Pink, the active player, places a Factory at [4, 1], which joins B's city. Housing
// follows at once, but B's Residence is full, so the people stay at B's Station.

const fullResidence = residence(['grey', 'grey', 'grey'])
const placeFactory = (state: VotesState) => applyMove(withTiles(state, { '5,1': fullResidence }), { kind: 'place', tile: 'factory', at: '4,1' })

describe('a new Factory', () => {
  const board = withBag(newGame(), { vermillion: 5 })
  const arrived = placeFactory(board)

  it('draws 3 people from the bag onto its city’s Station', () => {
    expect(arrived.tiles['5,0']).toEqual(station(['vermillion', 'vermillion', 'vermillion']))
  })

  it('takes them out of the bag', () => {
    expect(bagSize(arrived)).toBe(bagSize(board) - 3)
  })

  it('brings nobody to other cities’ Stations', () => {
    expect(arrived.tiles['9,3']).toEqual(station())
  })

  it('brings only as many as the bag holds', () => {
    expect(placeFactory(withBag(newGame(), { pink: 2 })).tiles['5,0']).toEqual(station(['pink', 'pink']))
  })

  it('brings nobody from an empty bag', () => {
    expect(placeFactory(withBag(newGame(), {})).tiles['5,0']).toEqual(station())
  })

  it('draws the same cubes from the same state', () => {
    const state = withBag(newGame(), { vermillion: 3, pink: 3 })
    expect(placeFactory(state).tiles).toEqual(placeFactory(state).tiles)
  })
})

describe('other tiles', () => {
  it('bring nobody', () => {
    const state = applyMove(withBag(newGame(), { pink: 5 }), { kind: 'place', tile: 'residence', at: '4,1' })
    expect(state.tiles['5,0']).toEqual(station())
  })
})

describe('a Factory in a city with two Stations', () => {
  // A and D join when a Factory at [1, 5] connects the arms at [1, 4] and [1, 6]. The
  // starting Residences are full, so nobody can be housed and the arrival stays visible.
  const joined = withBag(
    withTiles(newGame(), {
      '1,2': fullResidence,
      '1,7': fullResidence,
      '1,4': school(),
      '1,6': school(),
    }),
    { vermillion: 6 },
  )
  const choosing = applyMove(joined, { kind: 'place', tile: 'factory', at: '1,5' })

  it('lets the player choose the Station', () => {
    expect(choosing.phase).toEqual({ kind: 'immigration', stations: ['1,3', '2,7'] })
  })

  it('brings the people to the Station chosen', () => {
    const arrived = applyMove(choosing, { kind: 'arrive', station: '2,7' })
    expect(arrived.tiles['2,7']).toEqual(station(['vermillion', 'vermillion', 'vermillion']))
    expect(arrived.tiles['1,3']).toEqual(station())
  })

  it('refuses a Station outside the city', () => {
    expect(() => applyMove(choosing, { kind: 'arrive', station: '9,3' })).toThrow(IllegalMoveError)
  })
})
