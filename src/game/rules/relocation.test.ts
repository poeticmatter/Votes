import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { applyMove } from './turnFlow'
import { factory, newGame, residence, school, station, withTiles } from './testStates'
import type { CubeColor, VotesState } from './types'

// A sage School at [4, 1] in B touches B's starting Residence [5, 1] and B's Residence
// [4, 2]. Pink is the active player.
const SCHOOL = '4,1'
const START_B = '5,1'
const NEW_B = '4,2'
const START_A = '1,2'
const STATION_A = '1,3'

const board = withTiles(newGame(), {
  [START_B]: residence('B', ['grey', 'grey', 'vermillion']),
  [NEW_B]: residence('B', ['vermillion']),
  [START_A]: residence('A', ['pink', 'grey']),
  [STATION_A]: station('A', ['grey']),
})
const placeSchool = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'school', color: 'sage', at: SCHOOL })
const relocating = placeSchool(board)

const relocate = (state: VotesState, from: string, color: CubeColor, to: string) =>
  applyMove(state, { kind: 'relocate', from, color, to })

describe('a School’s relocation', () => {
  it('owes a person to each Residence next to the School', () => {
    expect(relocating.phase).toEqual({ kind: 'relocation', residences: [START_B, NEW_B] })
  })

  it('moves a person into a Residence even when it’s full', () => {
    const state = relocate(relocating, START_A, 'pink', START_B)
    expect(state.tiles[START_B]).toEqual(residence('B', ['grey', 'grey', 'vermillion', 'pink']))
  })

  it('takes the person from where the player chose', () => {
    const state = relocate(relocating, START_A, 'pink', START_B)
    expect(state.tiles[START_A]).toEqual(residence('A', ['grey']))
  })

  it('can take a person waiting at a Station', () => {
    const state = relocate(relocating, STATION_A, 'grey', NEW_B)
    expect(state.tiles[STATION_A]).toEqual(station('A'))
  })

  it('refuses a Residence the School doesn’t touch', () => {
    expect(() => relocate(relocating, STATION_A, 'grey', START_A)).toThrow(IllegalMoveError)
  })

  it('refuses to move a person into the Residence they’re already in', () => {
    expect(() => relocate(relocating, START_B, 'grey', START_B)).toThrow(IllegalMoveError)
  })

  it('ends the turn once every Residence has its person', () => {
    const done = relocate(relocate(relocating, START_A, 'pink', START_B), START_A, 'grey', NEW_B)
    expect(done.turn.playerIndex).toBe(1)
  })

  it('moves nobody for a School with no Residence next to it', () => {
    // [4, 0] touches B's Station and Factory at [3, 0] but no Residence.
    const lonely = applyMove(withTiles(newGame(), { '3,0': factory('B') }), { kind: 'place', tile: 'school', color: 'sage', at: '4,0' })
    expect(lonely.turn.playerIndex).toBe(1)
  })
})

describe('a School’s votes', () => {
  const pinkInBag = (state: VotesState) => state.bag.pink ?? 0

  it('adds a vote for each Residence next to it that touches no other School', () => {
    expect(pinkInBag(relocating) - pinkInBag(board)).toBe(2)
  })

  it('adds none for a Residence that touches another School', () => {
    // [3, 2] is another School beside B's new Residence.
    const withRival = withTiles(board, { '3,2': school('B') })
    expect(pinkInBag(placeSchool(withRival)) - pinkInBag(withRival)).toBe(1)
  })

  it('adds a vote for each person relocated', () => {
    const state = relocate(relocating, START_A, 'pink', START_B)
    expect(pinkInBag(state) - pinkInBag(relocating)).toBe(1)
  })
})
