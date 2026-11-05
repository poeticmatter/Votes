import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { flipTargets, takeableKinds } from './actions'
import { countVotes } from './elections'
import { applyMove } from './turnFlow'
import { chainBetween, chainWithGap, HOME, NEXT, soloNeighborsOf, startOf } from './testMap'
import {
  faceDownFactory,
  faceDownResidence,
  newGame,
  residence,
  school,
  tilesOn,
  withBag,
  withTiles,
  withTilesInHand,
} from './testStates'
import type { CubeColor, VotesState } from './types'

// Pink is the active player, with 2 Residence tiles in hand. Every starting Residence
// starts empty, and the bag is empty unless a test fills it.

const [FIRST, SECOND, THIRD] = soloNeighborsOf(HOME)
const greys = (count: number): CubeColor[] => Array<CubeColor>(count).fill('grey')
const board = (tiles: VotesState['tiles'] = {}) => withTiles(withBag(newGame(), {}), tiles)

describe('taking a tile', () => {
  it('offers Factories and Schools, never Residences', () => {
    expect(takeableKinds(newGame())).toEqual(['factory', 'school'])
  })

  it('moves the tile from the shared supply into the player’s own', () => {
    const state = newGame()
    const after = applyMove(state, { kind: 'take', tile: 'factory' })
    expect(after.players[0].supply.factory).toBe(1)
    expect(after.supply.factory).toBe(state.supply.factory - 1)
  })

  it('is the whole turn', () => {
    expect(applyMove(newGame(), { kind: 'take', tile: 'school' }).turn.playerIndex).toBe(1)
  })

  it('refuses a kind the shared supply has run out of', () => {
    const empty = { ...newGame(), supply: { ...newGame().supply, school: 0 } }
    expect(() => applyMove(empty, { kind: 'take', tile: 'school' })).toThrow(IllegalMoveError)
  })
})

describe('a Residence placed face down', () => {
  it('adds 1 of the player’s cubes to the bag for each overcrowded Residence in its city', () => {
    const crowded = board({ [startOf(HOME)]: residence(greys(4)), [FIRST]: residence(greys(5)), [SECOND]: residence(greys(3)) })
    const state = applyMove(crowded, { kind: 'place', tile: 'residence', at: THIRD })
    expect(state.bag.pink).toBe(2)
    expect(state.log.find(entry => entry.kind === 'promised')).toMatchObject({ votes: 2 })
  })

  it('adds nothing while no Residence in the city is overcrowded', () => {
    const state = applyMove(board({ [startOf(HOME)]: residence(greys(3)) }), { kind: 'place', tile: 'residence', at: FIRST })
    expect(state.bag.pink ?? 0).toBe(0)
  })

  it('is no seat, and nobody moves into it', () => {
    const state = applyMove(board({ [startOf(HOME)]: residence(greys(4)) }), { kind: 'place', tile: 'residence', at: FIRST })
    expect(state.tiles[FIRST]).toEqual(faceDownResidence())
    expect(countVotes(state, [HOME]).seats.map(seat => seat.residence)).toEqual([startOf(HOME)])
  })
})

describe('a Factory placed face down', () => {
  const withFactory = (state: VotesState) => withTilesInHand(state, { factory: 1 })

  it('gives the player 2 Residence tiles from the shared supply', () => {
    const state = withFactory(board())
    const after = applyMove(state, { kind: 'place', tile: 'factory', at: FIRST })
    expect(after.players[0].supply.residence).toBe(4)
    expect(after.supply.residence).toBe(state.supply.residence - 2)
  })

  it('gives only what the shared supply has left', () => {
    const state = { ...withFactory(board()), supply: { ...board().supply, residence: 1 } }
    expect(applyMove(state, { kind: 'place', tile: 'factory', at: FIRST }).players[0].supply.residence).toBe(3)
  })

  it('brings nobody until it’s flipped', () => {
    const state = applyMove(withBag(withFactory(newGame()), { pink: 5 }), { kind: 'place', tile: 'factory', at: FIRST })
    expect(state.bag.pink).toBe(5)
  })
})

describe('flipping', () => {
  it('offers every face-down tile, whoever placed it, and nothing face up', () => {
    const state = board({ [FIRST]: faceDownResidence(), [SECOND]: faceDownFactory(), [THIRD]: residence() })
    expect(flipTargets(state).sort()).toEqual([FIRST, SECOND].sort())
  })

  it('turns a Residence into a seat, and people level into it', () => {
    const state = applyMove(board({ [startOf(HOME)]: residence(greys(4)), [FIRST]: faceDownResidence() }), { kind: 'flip', at: FIRST })
    expect(state.tiles[FIRST]).toEqual(residence(greys(2)))
    expect(state.tiles[startOf(HOME)]).toEqual(residence(greys(2)))
  })

  it('leaves a lone School alone', () => {
    expect(flipTargets(board({ [FIRST]: school() }))).toEqual([])
  })

  it('turns a School into a University in a city with two Schools', () => {
    // Two cities with a School each, joined by a merger.
    const { filled, gap } = chainWithGap(chainBetween(HOME, NEXT))
    const merged = board({ ...tilesOn(filled, residence), [gap]: residence(), [filled[0]]: school(), [filled[filled.length - 1]]: school() })
    expect(flipTargets(merged).sort()).toEqual([filled[0], filled[filled.length - 1]].sort())
    const state = applyMove(merged, { kind: 'flip', at: filled[0] })
    expect(state.tiles[filled[0]]).toEqual({ kind: 'school', isUniversity: true })
  })

  it('refuses a tile that can’t be flipped', () => {
    expect(() => applyMove(board(), { kind: 'flip', at: startOf(HOME) })).toThrow(IllegalMoveError)
  })
})
