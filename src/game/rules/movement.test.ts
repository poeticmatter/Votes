import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { beginMovement, movementMoves } from './movement'
import { applyMove } from './turnFlow'
import { FAR, HOME, must, NEXT, soloNeighborsOf, startOf, townSpots } from './testMap'
import { faceDownResidence, newGame, residence, school, university, withBag, withTiles, withTilesInHand } from './testStates'
import type { CubeColor, VotesState } from './types'

// Pink is the active player. Every starting Residence starts empty, so each test decides
// who lives where. An empty bag keeps flips from bringing anyone in.

const [FIRST, SECOND, THIRD] = townSpots(HOME)
const greys = (count: number): CubeColor[] => Array<CubeColor>(count).fill('grey')

const moving = (tiles: VotesState['tiles']) => beginMovement(withTiles(withBag(newGame(), {}), tiles))
const sources = (state: VotesState) => [...new Set(movementMoves(state).map(move => move.from))]
const destinations = (state: VotesState) => [...new Set(movementMoves(state).map(move => move.to))].sort()

describe('levelling', () => {
  it('moves people into a flipped Residence with at least 2 fewer', () => {
    const board = withTiles(withBag(newGame(), {}), { [startOf(HOME)]: residence(greys(3)), [FIRST]: faceDownResidence() })
    const state = applyMove(board, { kind: 'flip', at: FIRST })
    expect(state.tiles[startOf(HOME)]).toEqual(residence(greys(2)))
    expect(state.tiles[FIRST]).toEqual(residence(greys(1)))
  })

  it('stops once no Residence has 2 fewer than another', () => {
    expect(movementMoves(moving({ [startOf(HOME)]: residence(greys(2)), [FIRST]: residence(greys(1)) }))).toEqual([])
  })

  it('never moves anyone into a face-down Residence', () => {
    expect(movementMoves(moving({ [startOf(HOME)]: residence(greys(3)), [FIRST]: faceDownResidence() }))).toEqual([])
  })

  it('moves from the most crowded Residence first', () => {
    const state = moving({ [startOf(HOME)]: residence(greys(4)), [FIRST]: residence(greys(3)), [SECOND]: residence() })
    expect(sources(state)).toEqual([startOf(HOME)])
  })

  it('moves into the least crowded Residence', () => {
    const state = moving({ [startOf(HOME)]: residence(greys(4)), [FIRST]: residence(greys(1)), [SECOND]: residence() })
    expect(destinations(state)).toEqual([SECOND])
  })

  it('lets the player choose between destinations that tie, and which person moves', () => {
    const state = moving({ [startOf(HOME)]: residence(['grey', 'pink', 'grey']), [FIRST]: residence(), [SECOND]: residence() })
    expect(destinations(state)).toEqual([FIRST, SECOND].sort())
    expect([...new Set(movementMoves(state).map(move => move.color))].sort()).toEqual(['grey', 'pink'])
  })

  it('adds nothing to the bag', () => {
    const state = moving({ [startOf(HOME)]: residence(greys(3)), [FIRST]: residence() })
    const moved = applyMove(state, { kind: 'move', from: startOf(HOME), color: 'grey', to: FIRST })
    expect(moved.bag).toEqual(state.bag)
  })

  it('refuses a move the rules don’t offer', () => {
    const state = moving({ [startOf(HOME)]: residence(greys(4)), [FIRST]: residence(greys(1)), [SECOND]: residence() })
    expect(() => applyMove(state, { kind: 'move', from: startOf(HOME), color: 'grey', to: FIRST })).toThrow(IllegalMoveError)
  })
})

describe('School pulls', () => {
  // HOME has a School beside its starting Residence; NEXT and FAR are cities of their own.
  const schoolCity = (tiles: VotesState['tiles']) => moving({ [THIRD]: school(), ...tiles })

  it('pull a person from a city without a School into one with fewer people', () => {
    const state = schoolCity({ [startOf(NEXT)]: residence(greys(1)), [startOf(HOME)]: residence() })
    expect(movementMoves(state)).toEqual([{ from: startOf(NEXT), color: 'grey', to: startOf(HOME) }])
  })

  it('need the source to have more people than the destination', () => {
    expect(movementMoves(schoolCity({ [startOf(NEXT)]: residence(greys(1)), [startOf(HOME)]: residence(greys(1)) }))).toEqual([])
  })

  it('never take from another city with a School', () => {
    const otherSchool = must(soloNeighborsOf(NEXT)[0], `free hex beside town ${NEXT}`)
    expect(movementMoves(schoolCity({ [startOf(NEXT)]: residence(greys(2)), [otherSchool]: school() }))).toEqual([])
  })

  it('wait until nobody in any city can level', () => {
    const state = schoolCity({ [startOf(NEXT)]: residence(greys(1)), [startOf(FAR)]: residence(greys(3)), [soloNeighborsOf(FAR)[0]]: residence() })
    expect(movementMoves(state).every(move => move.from === startOf(FAR))).toBe(true)
  })

  it('run by themselves after a School is placed, until nobody can move', () => {
    const board = withTilesInHand(withTiles(withBag(newGame(), {}), { [startOf(NEXT)]: residence(greys(3)) }), { school: 1 })
    const state = applyMove(board, { kind: 'place', tile: 'school', at: THIRD })
    expect(state.tiles[startOf(NEXT)]).toEqual(residence(greys(1)))
    expect(state.tiles[startOf(HOME)]).toEqual(residence(greys(2)))
    expect(state.log.filter(entry => entry.kind === 'moved').every(entry => entry.reason === 'schoolPull')).toBe(true)
  })
})

describe('University pulls', () => {
  // HOME has a University; NEXT has a plain School.
  const otherSchool = must(soloNeighborsOf(NEXT)[0], `free hex beside town ${NEXT}`)

  it('take from a city that has a School but no University', () => {
    const state = moving({ [THIRD]: university(), [otherSchool]: school(), [startOf(NEXT)]: residence(greys(1)), [startOf(HOME)]: residence() })
    expect(movementMoves(state)).toEqual([{ from: startOf(NEXT), color: 'grey', to: startOf(HOME) }])
  })

  it('never take from another University city', () => {
    const state = moving({ [THIRD]: university(), [otherSchool]: university(), [startOf(NEXT)]: residence(greys(1)), [startOf(HOME)]: residence() })
    expect(movementMoves(state)).toEqual([])
  })
})
