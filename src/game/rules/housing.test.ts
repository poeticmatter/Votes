import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { beginHousing, house, housingMoves } from './housing'
import { applyMove } from './turnFlow'
import { newGame, residence, station, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// Town E: its Station at [7, 6], a new Residence at [8, 6], and its starting Residence
// at [8, 7]. C's starting Residence is at [9, 2].
const STATION_E = '7,6'
const NEW_E = '8,6'
const START_E = '8,7'
const START_C = '9,2'

function housing(tiles: VotesState['tiles'], cities?: VotesState['cities']): VotesState {
  const state = withTiles(newGame(), { [STATION_E]: station('E', ['grey']), ...tiles })
  return beginHousing(cities ? { ...state, cities } : state)
}

describe('where waiting people can move in', () => {
  it('offers Residences with space in the Station’s city', () => {
    const state = housing({ [NEW_E]: residence('E'), [START_E]: residence('E', ['grey', 'grey', 'grey']) })
    expect(housingMoves(state)).toEqual([{ from: STATION_E, color: 'grey', to: NEW_E }])
  })

  it('reaches every town of a merged city', () => {
    const fullE = { [START_E]: residence('E', ['grey', 'grey', 'grey']) }
    const merged = housing(fullE, [['A'], ['B'], ['C', 'E'], ['D']])
    expect(housingMoves(merged).map(move => move.to)).toEqual([START_C])
  })

  it('refuses a Residence in another city', () => {
    expect(() => house(housing({}), { from: STATION_E, color: 'grey', to: START_C })).toThrow(IllegalMoveError)
  })
})

describe('votes for housing', () => {
  it('adds one of the active player’s cubes to the bag per person housed', () => {
    const state = housing({})
    expect(house(state, { from: STATION_E, color: 'grey', to: START_E }).bag).toEqual({ ...state.bag, pink: (state.bag.pink ?? 0) + 1 })
  })
})

describe('housing in a turn', () => {
  // Pink places a slate Factory at [10, 2], beside C's starting Residence, which brings
  // 3 people to C's Station at [9, 3].
  const placeFactory = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', color: 'slate', at: '10,2' })

  it('moves people in by itself when there is only one way to', () => {
    const state = placeFactory(withBag(newGame(), { grey: 3 }))
    expect(state.tiles[START_C]).toEqual(residence('C', ['grey', 'grey', 'grey']))
  })

  it('asks the active player when there is a choice', () => {
    const state = placeFactory(withBag(withTiles(newGame(), { '10,1': residence('C') }), { grey: 2, vermillion: 1 }))
    expect(state.phase).toEqual({ kind: 'housing' })
  })

  it('leaves people waiting when no Residence has space', () => {
    const full = withTiles(newGame(), { [START_C]: residence('C', ['grey', 'grey', 'grey']) })
    const state = placeFactory(withBag(full, { grey: 3 }))
    expect(state.tiles['9,3']).toEqual(station('C', ['grey', 'grey', 'grey']))
  })

  it('moves people left waiting into new space on a later turn', () => {
    const waiting = withTiles(newGame(), {
      [START_C]: residence('C', ['grey', 'grey', 'grey']),
      '9,3': station('C', ['grey']),
    })
    const state = applyMove(waiting, { kind: 'place', tile: 'residence', color: 'slate', at: '10,2' })
    expect(state.tiles['10,2']).toEqual(residence('C', ['grey']))
  })
})
