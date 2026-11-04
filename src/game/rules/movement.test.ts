import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { beginMovement, movementMoves } from './movement'
import { applyMove } from './turnFlow'
import { HOME, must, NEXT, soloNeighborsOf, startOf, townSpots } from './testMap'
import { newGame, residence, school, withBag, withTiles } from './testStates'
import type { CubeColor, VotesState } from './types'

// Pink is the active player. Every starting Residence starts empty, so each test decides
// who lives where. An empty bag keeps placements from bringing anyone in.

const [FIRST, SECOND, THIRD] = townSpots(HOME)
const greys = (count: number): CubeColor[] => Array<CubeColor>(count).fill('grey')

const moving = (tiles: VotesState['tiles']) => beginMovement(withTiles(withBag(newGame(), {}), tiles))
const sources = (state: VotesState) => [...new Set(movementMoves(state).map(move => move.from))]
const destinations = (state: VotesState) => [...new Set(movementMoves(state).map(move => move.to))].sort()

describe('levelling', () => {
  it('moves people into a new Residence with at least 2 fewer', () => {
    const board = withTiles(withBag(newGame(), {}), { [startOf(HOME)]: residence(greys(3)) })
    const state = applyMove(board, { kind: 'place', tile: 'residence', at: FIRST })
    expect(state.tiles[startOf(HOME)]).toEqual(residence(greys(2)))
    expect(state.tiles[FIRST]).toEqual(residence(greys(1)))
  })

  it('stops once no Residence has 2 fewer than another', () => {
    expect(movementMoves(moving({ [startOf(HOME)]: residence(greys(2)), [FIRST]: residence(greys(1)) }))).toEqual([])
  })

  it('moves from the most crowded Residence first', () => {
    const state = moving({ [startOf(HOME)]: residence(greys(4)), [FIRST]: residence(greys(3)), [SECOND]: residence() })
    expect(sources(state)).toEqual([startOf(HOME)])
  })

  it('moves into the least crowded Residence', () => {
    const state = moving({ [startOf(HOME)]: residence(greys(4)), [FIRST]: residence(greys(1)), [SECOND]: residence() })
    expect(destinations(state)).toEqual([SECOND])
  })

  it('lets the player choose between destinations that tie', () => {
    const state = moving({ [startOf(HOME)]: residence(greys(3)), [FIRST]: residence(), [SECOND]: residence() })
    expect(destinations(state)).toEqual([FIRST, SECOND].sort())
  })

  it('lets the player choose which person moves', () => {
    const state = moving({ [startOf(HOME)]: residence(['grey', 'pink', 'grey']), [FIRST]: residence() })
    expect(movementMoves(state).map(move => move.color).sort()).toEqual(['grey', 'pink'])
  })

  it('never moves people between cities without a School', () => {
    expect(movementMoves(moving({ [startOf(HOME)]: residence(greys(3)), [startOf(NEXT)]: residence() }))).toEqual([])
  })

  it('adds 1 of the active player’s cubes to the bag for each person moved', () => {
    const state = moving({ [startOf(HOME)]: residence(['grey', 'grey', 'grey']), [FIRST]: residence() })
    const moved = applyMove(state, { kind: 'move', from: startOf(HOME), color: 'grey', to: FIRST })
    expect(moved.bag.pink).toBe(1)
    expect(moved.log.find(entry => entry.kind === 'moved')).toMatchObject({ reason: 'levelling', voter: 'pink' })
  })

  it('refuses a move the rules don’t offer', () => {
    const state = moving({ [startOf(HOME)]: residence(greys(4)), [FIRST]: residence(greys(1)), [SECOND]: residence() })
    expect(() => applyMove(state, { kind: 'move', from: startOf(HOME), color: 'grey', to: FIRST })).toThrow(IllegalMoveError)
  })
})

describe('School pulls', () => {
  // HOME has a School beside its starting Residence; NEXT is a city of its own.
  const SCHOOL_AT = THIRD
  const schoolCity = (tiles: VotesState['tiles']) => moving({ [SCHOOL_AT]: school(), ...tiles })

  it('pull a person from a city without a School into one with fewer people', () => {
    const state = schoolCity({ [startOf(NEXT)]: residence(greys(1)), [startOf(HOME)]: residence() })
    expect(movementMoves(state)).toEqual([{ from: startOf(NEXT), color: 'grey', to: startOf(HOME) }])
  })

  it('need the source to have more people than the destination', () => {
    expect(movementMoves(schoolCity({ [startOf(NEXT)]: residence(greys(1)), [startOf(HOME)]: residence(greys(1)) }))).toEqual([])
  })

  it('never take from another city with a School', () => {
    const otherSchool = must(soloNeighborsOf(NEXT)[0], `free hex beside town ${NEXT}`)
    const state = schoolCity({ [startOf(NEXT)]: residence(greys(2)), [otherSchool]: school() })
    expect(movementMoves(state)).toEqual([])
  })

  it('never send people out of the School city', () => {
    expect(movementMoves(schoolCity({ [startOf(HOME)]: residence(greys(2)) }))).toEqual([])
  })

  it('run by themselves after the School is placed, until nobody can move', () => {
    const board = withTiles(withBag(newGame(), {}), { [startOf(NEXT)]: residence(greys(3)) })
    const state = applyMove(board, { kind: 'place', tile: 'school', at: SCHOOL_AT })
    expect(state.tiles[startOf(NEXT)]).toEqual(residence(greys(1)))
    expect(state.tiles[startOf(HOME)]).toEqual(residence(greys(2)))
    expect(state.bag.pink).toBe(2)
    expect(state.log.filter(entry => entry.kind === 'moved').every(entry => entry.reason === 'schoolPull')).toBe(true)
  })
})
