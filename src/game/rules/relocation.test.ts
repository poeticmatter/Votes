import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { applyMove } from './turnFlow'
import { newGame, residence, school, station, withTiles } from './testStates'
import type { CubeColor, VotesState } from './types'

// A School at [4, 1] touches B's starting Residence [5, 1] and the Residence at [4, 2].
// Pink is the active player.
const SCHOOL = '4,1'
const START_B = '5,1'
const NEW_B = '4,2'
const START_A = '1,2'
const STATION_A = '1,3'

const board = withTiles(newGame(), {
  [START_B]: residence(['grey', 'grey', 'vermillion']),
  [NEW_B]: residence(['vermillion']),
  [START_A]: residence(['pink', 'grey']),
})
const placeSchool = (state: VotesState, at = SCHOOL) => applyMove(state, { kind: 'place', tile: 'school', at })
const relocating = placeSchool(board)

const relocate = (state: VotesState, from: string, color: CubeColor, to: string) =>
  applyMove(state, { kind: 'relocate', from, color, to })

describe('a School’s relocation', () => {
  it('offers each Residence next to the School', () => {
    expect(relocating.phase).toEqual({ kind: 'relocation', residences: [START_B, NEW_B] })
  })

  it('leaves out a Residence that touches another School', () => {
    // [3, 2] is a School beside [4, 2].
    const withRival = placeSchool(withTiles(board, { '3,2': school() }))
    expect(withRival.phase).toEqual({ kind: 'relocation', residences: [START_B] })
  })

  it('moves a person into a Residence even when it’s full', () => {
    const state = relocate(relocating, START_A, 'pink', START_B)
    expect(state.tiles[START_B]).toEqual(residence(['grey', 'grey', 'vermillion', 'pink']))
  })

  it('takes the person from where the player chose', () => {
    const state = relocate(relocating, START_A, 'pink', START_B)
    expect(state.tiles[START_A]).toEqual(residence(['grey']))
  })

  it('can take a person waiting at a Station', () => {
    const waiting = placeSchool(withTiles(board, { [STATION_A]: station(['grey']) }))
    expect(relocate(waiting, STATION_A, 'grey', NEW_B).tiles[STATION_A]).toEqual(station())
  })

  it('moves only the one person, then the turn goes on', () => {
    expect(relocate(relocating, START_A, 'pink', START_B).turn.playerIndex).toBe(1)
  })

  it('adds a vote for the person moved in', () => {
    const state = relocate(relocating, START_A, 'pink', START_B)
    expect(state.bag.pink).toBe((board.bag.pink ?? 0) + 1)
  })

  it('records the move as a relocated entry', () => {
    const entry = relocate(relocating, START_A, 'pink', START_B).log.at(-1)
    expect(entry).toMatchObject({ kind: 'relocated', from: START_A, to: START_B, color: 'pink', voter: 'pink' })
  })

  it('refuses a Residence the School doesn’t touch', () => {
    expect(() => relocate(relocating, START_B, 'grey', START_A)).toThrow(IllegalMoveError)
  })

  it('refuses to move a person into the Residence they’re already in', () => {
    expect(() => relocate(relocating, START_B, 'grey', START_B)).toThrow(IllegalMoveError)
  })

  it('moves nobody for a School with no Residence to fill', () => {
    // [4, 0] touches B's Station but no Residence.
    expect(placeSchool(newGame(), '4,0').turn.playerIndex).toBe(1)
  })
})
