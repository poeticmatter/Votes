import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { beginHousing, house, housingMoves } from './housing'
import { applyMove } from './turnFlow'
import { newGame, residence, station, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// District E: vermillion's Station at [7, 6], pink's Residence at [8, 6], and the
// printed Residence at [8, 7]. C's printed Residence is at [9, 2].
const STATION = '7,6'
const PINKS_E = '8,6'
const PRINTED_E = '8,7'
const PRINTED_C = '9,2'

function housing(tiles: VotesState['tiles'], cities?: VotesState['cities']): VotesState {
  const state = withTiles(newGame(), { [STATION]: station('vermillion', ['grey']), ...tiles })
  return beginHousing(cities ? { ...state, cities } : state)
}

describe('where waiting people can move in', () => {
  it('offers Residences with space in the Station’s city', () => {
    const state = housing({ [PINKS_E]: residence('pink'), [PRINTED_E]: residence(null, ['grey', 'grey', 'grey']) })
    expect(housingMoves(state)).toEqual([{ from: STATION, color: 'grey', to: PINKS_E }])
  })

  it('reaches every district of a merged city', () => {
    const merged = housing({ [PRINTED_E]: residence(null, ['grey', 'grey', 'grey']) }, [['A'], ['B'], ['C', 'E'], ['D']])
    expect(housingMoves(merged).map(move => move.to)).toEqual([PRINTED_C])
  })

  it('refuses a Residence in another city', () => {
    const state = housing({})
    expect(() => house(state, { from: STATION, color: 'grey', to: PRINTED_C })).toThrow(IllegalMoveError)
  })
})

describe('paying for housing', () => {
  it('pays a Residence’s owner for a person from another player’s Station', () => {
    const state = house(housing({ [PINKS_E]: residence('pink') }), { from: STATION, color: 'grey', to: PINKS_E })
    expect(state.bag).toEqual({ ...newGame().bag, pink: (newGame().bag.pink ?? 0) + 1 })
  })

  it('pays nobody when the Station and Residence have the same owner', () => {
    const state = housing({ [PINKS_E]: residence('vermillion') })
    expect(house(state, { from: STATION, color: 'grey', to: PINKS_E }).bag).toEqual(state.bag)
  })

  it('pays nobody for a printed Residence', () => {
    const state = housing({})
    expect(house(state, { from: STATION, color: 'grey', to: PRINTED_E }).bag).toEqual(state.bag)
  })
})

describe('housing in a turn', () => {
  // Pink places a Station at [9, 3] in C, beside C's printed Residence. A bag of pink cubes
  // keeps the draws certain, since pink pays each one back in pink.
  const placeStation = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'station', at: '9,3' })

  it('moves people in by itself when there is only one way to', () => {
    const state = placeStation(withBag(newGame(), { pink: 4 }))
    expect(state.tiles[PRINTED_C]).toEqual(residence(null, ['pink', 'pink']))
  })

  it('asks the active player when there is a choice', () => {
    const state = placeStation(withBag(withTiles(newGame(), { '10,2': residence('vermillion') }), { pink: 4 }))
    expect(state.phase).toEqual({ kind: 'housing' })
  })

  it('leaves people waiting when no Residence has space', () => {
    const full = withTiles(newGame(), { [PRINTED_C]: residence(null, ['grey', 'grey', 'grey']) })
    const state = placeStation(withBag(full, { pink: 4 }))
    expect(state.tiles['9,3']).toEqual(station('pink', ['pink', 'pink']))
  })

  it('moves people left waiting into new space on a later turn', () => {
    const waiting = withTiles(newGame(), {
      [PRINTED_C]: residence(null, ['grey', 'grey', 'grey']),
      '9,3': station('vermillion', ['grey']),
    })
    // [10, 2] touches C's printed Residence.
    const state = applyMove(waiting, { kind: 'place', tile: 'residence', at: '10,2' })
    expect(state.tiles['10,2']).toEqual(residence('pink', ['grey']))
  })
})
