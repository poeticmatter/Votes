import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from '../../platform/IllegalMoveError'
import { bagSize } from './boardQueries'
import { beginImmigration, callStation, canStationBringFamily, settleFamily } from './immigration'
import { factory, newGame, residence, station, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// District C: printed Residence at [9, 2]; [8, 3] borders the rail.
const STATION = '8,3'
const PRINTED_C = '9,2'
const OWNED_C = '10,2'

function boardWithStation(extraTiles: VotesState['tiles'] = {}): VotesState {
  const state = withTiles(newGame(), { [STATION]: station('blue'), '10,3': factory(), ...extraTiles })
  return withBag(state, { grey: 4 })
}

function bringFamilyTo(state: VotesState, residenceKey: string): VotesState {
  return settleFamily(callStation(beginImmigration(state), STATION), residenceKey)
}

describe('which Stations can bring a family', () => {
  it('needs an open job', () => {
    const noFactory = withTiles(newGame(), { [STATION]: station('blue') })
    expect(canStationBringFamily(noFactory, STATION)).toBe(false)
  })

  it('stops once families fill every job', () => {
    const fiveFamilies = residence(null, ['grey', 'grey', 'grey'])
    const state = boardWithStation({ [PRINTED_C]: fiveFamilies, [OWNED_C]: residence('blue', ['grey', 'grey']) })
    expect(canStationBringFamily(state, STATION)).toBe(false)
  })

  it('needs an empty home in its own district', () => {
    const state = boardWithStation({ [PRINTED_C]: residence(null, ['grey', 'grey', 'grey']) })
    expect(canStationBringFamily(state, STATION)).toBe(false)
  })

  it('brings one when there is a home and a job', () => {
    expect(canStationBringFamily(boardWithStation(), STATION)).toBe(true)
  })
})

describe('bringing a family', () => {
  it('moves the drawn cube into the chosen Residence', () => {
    const state = bringFamilyTo(boardWithStation(), PRINTED_C)
    expect(state.tiles[PRINTED_C]).toEqual(residence(null, ['grey']))
  })

  it('has only the Station’s owner add a cube for a printed Residence', () => {
    const state = bringFamilyTo(boardWithStation(), PRINTED_C)
    expect(state.bag).toEqual({ grey: 3, blue: 1 })
  })

  it('has both owners add a cube when they differ', () => {
    const state = bringFamilyTo(boardWithStation({ [OWNED_C]: residence('vermillion') }), OWNED_C)
    expect(state.bag).toEqual({ grey: 3, blue: 1, vermillion: 1 })
  })

  it('adds just one cube when one player owns both', () => {
    const state = bringFamilyTo(boardWithStation({ [OWNED_C]: residence('blue') }), OWNED_C)
    expect(state.bag).toEqual({ grey: 3, blue: 1 })
  })

  it('never shrinks the bag', () => {
    const before = boardWithStation()
    expect(bagSize(bringFamilyTo(before, PRINTED_C))).toBe(bagSize(before))
  })

  it('refuses a Residence outside the Station’s district', () => {
    const drawn = callStation(beginImmigration(boardWithStation({ '4,1': residence('blue') })), STATION)
    expect(() => settleFamily(drawn, '4,1')).toThrow(IllegalMoveError)
  })

  it('lets each Station bring only one family per turn', () => {
    const state = bringFamilyTo(boardWithStation(), PRINTED_C)
    expect(() => callStation(state, STATION)).toThrow(IllegalMoveError)
  })
})

describe('drawing from the bag', () => {
  it('draws the same cube from the same state', () => {
    const state = beginImmigration(withBag(boardWithStation(), { grey: 3, blue: 3, vermillion: 3 }))
    expect(callStation(state, STATION).phase).toEqual(callStation(state, STATION).phase)
  })
})
