import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { legalPulls } from './pulls'
import { applyMove } from './turnFlow'
import { HOME, NEXT, soloNeighborOf, startOf, townSpots } from './testMap'
import { factory, newGame, pulling, residence, school, withTiles } from './testStates'
import type { CubeColor, Pull, VotesState } from './types'

// Pink is pulling. Every starting Residence and printed Factory starts empty and the bag
// empty, so each test decides where every cube is. HOME gets three more tiles at FIRST,
// SECOND and THIRD; NEXT is another city.

const [FIRST, SECOND, THIRD] = townSpots(HOME)
const greys = (count: number): CubeColor[] => Array<CubeColor>(count).fill('grey')
const board = (tiles: VotesState['tiles']) => pulling(withTiles(newGame(), tiles))
const pullsInto = (state: VotesState, to: string) => legalPulls(state).filter(move => move.to === to)
const doPull = (state: VotesState, move: Pull) => applyMove(state, { kind: 'pull', ...move })

describe('pulling from a Factory', () => {
  const withFactory = (cubes: CubeColor[], owner: 'vermillion' | null = 'vermillion', people: CubeColor[] = []) =>
    board({ [FIRST]: residence(people, 'pink'), [SECOND]: factory(cubes, owner) })

  it('moves a cube from a Factory in the city into the player’s Residence', () => {
    const state = doPull(withFactory(['blue']), { from: SECOND, color: 'blue', to: FIRST, credit: null })
    expect(state.tiles[FIRST]).toEqual(residence(['blue'], 'pink'))
    expect(state.tiles[SECOND]).toEqual(factory([], 'vermillion'))
  })

  it('has the Factory’s owner add 1 of their cubes to the bag', () => {
    expect(doPull(withFactory(['blue']), { from: SECOND, color: 'blue', to: FIRST, credit: null }).bag).toEqual({ vermillion: 1 })
  })

  it('adds a grey cube for a printed Factory, owned by nobody', () => {
    expect(doPull(withFactory(['blue'], null), { from: SECOND, color: 'blue', to: FIRST, credit: null }).bag).toEqual({ grey: 1 })
  })

  it('stops once the Residence holds 3 people', () => {
    expect(pullsInto(withFactory(['blue'], 'vermillion', greys(2)), FIRST)).toHaveLength(1)
    expect(pullsInto(withFactory(['blue'], 'vermillion', greys(3)), FIRST)).toEqual([])
  })

  it('offers one pull per colour on the Factory', () => {
    expect(pullsInto(withFactory(['blue', 'grey', 'blue']), FIRST).map(move => move.color)).toEqual(['blue', 'grey'])
  })
})

describe('pulling from a Residence', () => {
  it('needs the source to hold at least 2 more people', () => {
    const twoMore = board({ [FIRST]: residence(greys(1), 'pink'), [startOf(HOME)]: residence(greys(3)) })
    const oneMore = board({ [FIRST]: residence(greys(1), 'pink'), [startOf(HOME)]: residence(greys(2)) })
    expect(pullsInto(twoMore, FIRST)).toHaveLength(1)
    expect(pullsInto(oneMore, FIRST)).toEqual([])
  })

  it('takes the leftmost person of the chosen colour', () => {
    const state = board({ [FIRST]: residence([], 'pink'), [startOf(HOME)]: residence(['blue', 'grey', 'blue']) })
    const pulled = doPull(state, { from: startOf(HOME), color: 'blue', to: FIRST, credit: null })
    expect(pulled.tiles[startOf(HOME)]).toEqual(residence(['grey', 'blue']))
  })

  it('adds nothing to the bag within a city', () => {
    const state = board({ [FIRST]: residence([], 'pink'), [startOf(HOME)]: residence(greys(2)) })
    expect(doPull(state, { from: startOf(HOME), color: 'grey', to: FIRST, credit: null }).bag).toEqual({})
  })
})

describe('where a player may pull', () => {
  it('into a starting Residence, which belongs to nobody', () => {
    expect(pullsInto(board({ [startOf(HOME)]: residence(), [FIRST]: factory(['blue']) }), startOf(HOME))).toHaveLength(1)
  })

  it('never into a rival’s Residence', () => {
    expect(pullsInto(board({ [THIRD]: residence([], 'vermillion'), [FIRST]: factory(['blue']) }), THIRD)).toEqual([])
  })

  it('never from another city, without a School', () => {
    const state = board({ [FIRST]: residence([], 'pink'), [startOf(NEXT)]: residence(greys(3)), [soloNeighborOf(NEXT)]: factory(['blue']) })
    expect(pullsInto(state, FIRST)).toEqual([])
  })
})

describe('pulling through a School', () => {
  const schoolCity = (tiles: VotesState['tiles']) =>
    board({ [FIRST]: residence([], 'pink'), [THIRD]: school('vermillion'), [startOf(NEXT)]: residence(greys(3)), ...tiles })

  it('reaches Residences and Factories in other cities', () => {
    const state = schoolCity({ [soloNeighborOf(NEXT)]: factory(['blue']) })
    expect(pullsInto(state, FIRST).map(move => move.from).sort()).toEqual([startOf(NEXT), soloNeighborOf(NEXT)].sort())
  })

  it('has the School’s owner add 1 cube for each person from another city', () => {
    const state = doPull(schoolCity({}), { from: startOf(NEXT), color: 'grey', to: FIRST, credit: 'vermillion' })
    expect(state.bag).toEqual({ vermillion: 1 })
  })

  it('credits nobody’s School for a pull within the city', () => {
    const state = schoolCity({ [SECOND]: factory(['blue']) })
    expect(pullsInto(state, FIRST).find(move => move.from === SECOND)?.credit).toBeNull()
  })

  it('lets the player choose whose School is credited when the city has two owners', () => {
    const state = schoolCity({ [SECOND]: school('blue') })
    expect(pullsInto(state, FIRST).map(move => move.credit).sort()).toEqual(['blue', 'vermillion'])
  })
})

describe('the pulling step', () => {
  it('lets the player pull again and again', () => {
    const state = board({ [FIRST]: residence([], 'pink'), [SECOND]: factory(['blue', 'blue']) })
    const once = doPull(state, { from: SECOND, color: 'blue', to: FIRST, credit: null })
    expect(doPull(once, { from: SECOND, color: 'blue', to: FIRST, credit: null }).tiles[FIRST]).toEqual(residence(['blue', 'blue'], 'pink'))
  })

  it('ends when the player ends the turn', () => {
    const state = applyMove(board({}), { kind: 'endTurn' })
    expect(state.turn.playerIndex).toBe(1)
    expect(state.phase).toEqual({ kind: 'action' })
  })

  it('refuses a pull the rules don’t offer', () => {
    const state = board({ [FIRST]: residence([], 'pink'), [startOf(HOME)]: residence(greys(1)) })
    expect(() => doPull(state, { from: startOf(HOME), color: 'grey', to: FIRST, credit: null })).toThrow(IllegalMoveError)
  })
})
