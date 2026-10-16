import { describe, expect, it } from 'vitest'
import type { HexKey } from '../map/hexGrid'
import { bagSize } from './boardQueries'
import { immigrate } from './immigration'
import { placeTile } from './placement'
import { newGame, residence, station, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// Pink, the active player, places the tile; immigration runs before any housing. The
// bags hold a single cube, so every draw is certain: each owner's payment is the only
// cube left for the next draw.

const placeAndImmigrate = (state: VotesState, tile: 'station' | 'factory', at: HexKey) => immigrate(placeTile(state, tile, at))

describe('a new Station', () => {
  // [9, 3] is a station site in C, beside C's printed Residence.
  const arrived = placeAndImmigrate(withBag(newGame(), { grey: 1 }), 'station', '9,3')

  it('draws 2 people from the bag onto itself', () => {
    expect(arrived.tiles['9,3']).toEqual(station('pink', ['grey', 'pink']))
  })

  it('has its owner add a cube to the bag right after each draw', () => {
    expect(arrived.bag).toEqual({ grey: 0, pink: 1 })
  })

  it('brings nobody from an empty bag', () => {
    expect(placeAndImmigrate(withBag(newGame(), {}), 'station', '9,3').tiles['9,3']).toEqual(station('pink'))
  })

  it('draws the same cubes from the same state', () => {
    const state = withBag(newGame(), { grey: 3, vermillion: 3, pink: 3 })
    expect(placeAndImmigrate(state, 'station', '9,3').tiles).toEqual(placeAndImmigrate(state, 'station', '9,3').tiles)
  })
})

describe('a new Factory', () => {
  // [8, 6] touches E's printed Residence; E has Stations at [7, 6] and [10, 5], C one at [9, 3].
  const board = withBag(
    withTiles(newGame(), { '7,6': station('vermillion'), '10,5': station('pink', ['grey']), '9,3': station('pink') }),
    { grey: 1 },
  )
  const arrived = placeAndImmigrate(board, 'factory', '8,6')

  it('draws 2 people onto every Station in its district, in board order', () => {
    expect([arrived.tiles['7,6'], arrived.tiles['10,5']]).toEqual([
      station('vermillion', ['grey', 'vermillion']),
      station('pink', ['grey', 'vermillion', 'pink']),
    ])
  })

  it('brings nobody to Stations in other districts', () => {
    expect(arrived.tiles['9,3']).toEqual(station('pink'))
  })

  it('never shrinks the bag', () => {
    expect(bagSize(arrived)).toBe(bagSize(board))
  })

  it('brings nobody to a district with no Station', () => {
    // [4, 1] touches B's printed Residence; B has no Station.
    const state = withTiles(newGame(), { '5,1': residence(null) })
    expect(placeAndImmigrate(state, 'factory', '4,1').log.some(entry => entry.kind === 'arrived')).toBe(false)
  })
})
