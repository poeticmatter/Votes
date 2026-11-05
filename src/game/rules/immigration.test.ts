import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { TOWN_IDS } from '../map/board'
import { bagSize, citiesOf } from './boardQueries'
import { applyMove } from './turnFlow'
import { HOME, NEXT, soloNeighborsOf, startOf } from './testMap'
import { faceDownFactory, newGame, residence, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// Pink, the active player, flips a face-down Factory beside HOME's tiles. Every starting
// Residence starts empty. A bag of pink only keeps the draws certain, since each arrival
// also adds a pink cube to it.

const [factoryAt, secondHome] = soloNeighborsOf(HOME)
const withFactory = (state: VotesState) => withTiles(state, { [factoryAt]: faceDownFactory() })
const flipFactory = (state: VotesState) => applyMove(withFactory(state), { kind: 'flip', at: factoryAt })

describe('flipping a Factory', () => {
  const board = withBag(newGame(), { pink: 10 })
  const arrived = flipFactory(board)

  it('draws 1 person from the bag for each city on the board', () => {
    expect(arrived.log.filter(entry => entry.kind === 'arrived')).toHaveLength(citiesOf(board).length)
  })

  it('puts each into a Residence of its own city', () => {
    for (const town of TOWN_IDS) expect(arrived.tiles[startOf(town)]).toEqual(residence(['pink']))
  })

  it('adds 1 of the active player’s cubes to the bag for each arrival', () => {
    expect(bagSize(arrived)).toBe(bagSize(board))
  })

  it('brings nobody from an empty bag', () => {
    expect(flipFactory(withBag(newGame(), {})).tiles[startOf(HOME)]).toEqual(residence())
  })

  it('draws the same cubes from the same state', () => {
    const state = withBag(newGame(), { vermillion: 3, pink: 3, grey: 3 })
    expect(flipFactory(state).tiles).toEqual(flipFactory(state).tiles)
  })
})

describe('arrivals in a city with several Residences', () => {
  // HOME's starting Residence and a second one tie at 1 person each; NEXT's starting
  // Residence holds 2, so nobody levels.
  const board = withBag(
    withTiles(newGame(), { [startOf(HOME)]: residence(['grey']), [secondHome]: residence(['grey']), [startOf(NEXT)]: residence(['grey', 'grey']) }),
    { pink: 10 },
  )
  const choosing = flipFactory(board)

  it('lets the player choose between Residences tied for least crowded', () => {
    expect(choosing.phase).toMatchObject({ kind: 'arrival', person: 'pink' })
    expect(choosing.phase.kind === 'arrival' && [...choosing.phase.residences].sort()).toEqual([startOf(HOME), secondHome].sort())
  })

  it('moves the person into the Residence chosen, then draws for the next city', () => {
    const chosen = applyMove(choosing, { kind: 'arrive', residence: secondHome })
    expect(chosen.tiles[secondHome]).toEqual(residence(['grey', 'pink']))
    expect(chosen.tiles[startOf(HOME)]).toEqual(residence(['grey']))
  })

  it('refuses a Residence that isn’t tied for least crowded', () => {
    expect(() => applyMove(choosing, { kind: 'arrive', residence: startOf(NEXT) })).toThrow(IllegalMoveError)
  })
})
