import { describe, expect, it } from 'vitest'
import { bagSize } from './boardQueries'
import { immigrate } from './immigration'
import { placeTile } from './placement'
import { newGame, station, withBag } from './testStates'
import type { VotesState } from './types'

// Pink, the active player, places a sage Factory at [4, 1], which joins town B; B's
// Station is at [5, 0]. Immigration runs before any housing.

const placeFactory = (state: VotesState) => immigrate(placeTile(state, 'factory', 'sage', '4,1'))

describe('a new Factory', () => {
  const board = withBag(newGame(), { grey: 5 })
  const arrived = placeFactory(board)

  it('draws 3 people from the bag onto its town’s Station', () => {
    expect(arrived.tiles['5,0']).toEqual(station('B', ['grey', 'grey', 'grey']))
  })

  it('takes them out of the bag', () => {
    expect(bagSize(arrived)).toBe(bagSize(board) - 3)
  })

  it('brings nobody to other towns’ Stations', () => {
    expect(arrived.tiles['9,3']).toEqual(station('C'))
  })

  it('brings only as many as the bag holds', () => {
    expect(placeFactory(withBag(newGame(), { pink: 2 })).tiles['5,0']).toEqual(station('B', ['pink', 'pink']))
  })

  it('brings nobody from an empty bag', () => {
    expect(placeFactory(withBag(newGame(), {})).tiles['5,0']).toEqual(station('B'))
  })

  it('draws the same cubes from the same state', () => {
    const state = withBag(newGame(), { grey: 3, vermillion: 3, pink: 3 })
    expect(placeFactory(state).tiles).toEqual(placeFactory(state).tiles)
  })
})

describe('other tiles', () => {
  it('bring nobody', () => {
    const state = immigrate(placeTile(withBag(newGame(), { grey: 5 }), 'residence', 'sage', '4,1'))
    expect(state.tiles['5,0']).toEqual(station('B'))
  })
})
