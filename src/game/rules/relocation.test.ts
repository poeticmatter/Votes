import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { applyMove } from './turnFlow'
import { factory, newGame, residence, station, withTiles } from './testStates'
import type { CubeColor, VotesState } from './types'

// A School at [4, 1] in B touches B's printed Residence [5, 1] and pink's Residence [4, 2].
const SCHOOL = '4,1'
const PRINTED_B = '5,1'
const PINKS_B = '4,2'
const PRINTED_A = '1,2'

const board = withTiles(newGame(), {
  [PRINTED_B]: residence(null, ['grey', 'grey', 'vermillion']),
  [PINKS_B]: residence('pink', ['vermillion']),
  [PRINTED_A]: residence(null, ['pink', 'grey']),
  '0,4': station('vermillion', ['grey']),
})
const relocating = applyMove(board, { kind: 'place', tile: 'school', at: SCHOOL })

const relocate = (state: VotesState, from: string, color: CubeColor, to: string) =>
  applyMove(state, { kind: 'relocate', from, color, to })

describe('a School’s relocation', () => {
  it('owes a person to each Residence next to the School', () => {
    expect(relocating.phase).toEqual({ kind: 'relocation', residences: [PRINTED_B, PINKS_B] })
  })

  it('moves a person into a Residence even when it’s full', () => {
    const state = relocate(relocating, PRINTED_A, 'pink', PRINTED_B)
    expect(state.tiles[PRINTED_B]).toEqual(residence(null, ['grey', 'grey', 'vermillion', 'pink']))
  })

  it('takes the person from where the player chose', () => {
    const state = relocate(relocating, PRINTED_A, 'pink', PRINTED_B)
    expect(state.tiles[PRINTED_A]).toEqual(residence(null, ['grey']))
  })

  it('can take a person waiting at a Station', () => {
    const state = relocate(relocating, '0,4', 'grey', PINKS_B)
    expect(state.tiles['0,4']).toEqual(station('vermillion'))
  })

  it('pays nobody', () => {
    expect(relocate(relocating, PRINTED_A, 'pink', PINKS_B).bag).toEqual(board.bag)
  })

  it('refuses a Residence the School doesn’t touch', () => {
    expect(() => relocate(relocating, '0,4', 'grey', PRINTED_A)).toThrow(IllegalMoveError)
  })

  it('refuses to move a person into the Residence they’re already in', () => {
    expect(() => relocate(relocating, PRINTED_B, 'grey', PRINTED_B)).toThrow(IllegalMoveError)
  })

  it('ends the turn once every Residence has its person', () => {
    const done = relocate(relocate(relocating, PRINTED_A, 'pink', PRINTED_B), PRINTED_A, 'grey', PINKS_B)
    expect(done.turn.playerIndex).toBe(1)
  })

  it('moves nobody for a School with no Residence next to it', () => {
    // [2, 1] touches A's Factory at [1, 1] but no Residence.
    const lonely = applyMove(withTiles(newGame(), { '1,1': factory() }), { kind: 'place', tile: 'school', at: '2,1' })
    expect(lonely.turn.playerIndex).toBe(1)
  })
})
