import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { beginHousing, house, housingMoves } from './housing'
import { applyMove } from './turnFlow'
import { chainBetween, HOME, must, NEXT, soloNeighborsOf, soloNeighborOf, startOf, stationOf } from './testMap'
import { crowdedTowns, factory, fullResidence, newGame, residence, school, station, tilesOn, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// Pink is the active player. Every starting Residence is full unless a test gives one
// room, so each test decides where there is space.

const NEW_HOME = soloNeighborOf(HOME)

function housing(tiles: VotesState['tiles']): VotesState {
  return beginHousing(withTiles(newGame(), { ...crowdedTowns(), ...tiles }))
}

const moveTo = (from: string, to: string) => ({ from, color: 'grey' as const, to })

describe('where waiting people can move in', () => {
  it('offers Residences with space in the Station’s city', () => {
    const state = housing({ [stationOf(HOME)]: station(['grey']), [NEW_HOME]: residence() })
    expect(housingMoves(state)).toEqual([moveTo(stationOf(HOME), NEW_HOME)])
  })

  it('refuses a Residence in another city', () => {
    const state = housing({ [stationOf(HOME)]: station(['grey']), [startOf(NEXT)]: residence() })
    expect(housingMoves(state)).toEqual([])
    expect(() => house(state, moveTo(stationOf(HOME), startOf(NEXT)))).toThrow(IllegalMoveError)
  })

  it('does not offer a full Residence', () => {
    expect(housingMoves(housing({ [stationOf(HOME)]: station(['grey']) }))).toEqual([])
  })

  it('reaches every Residence of a merged city', () => {
    const chain = tilesOn(chainBetween(HOME, NEXT), factory)
    const state = housing({ ...chain, [stationOf(NEXT)]: station(['grey']), [startOf(HOME)]: residence() })
    expect(housingMoves(state)).toEqual([moveTo(stationOf(NEXT), startOf(HOME))])
  })
})

describe('a city with a School', () => {
  // HOME has a School, a full starting Residence and room in a new one; NEXT is a city of
  // its own. Every other Residence starts empty, so a School city could pull from any
  // crowded one.
  const SCHOOL_AT = must(soloNeighborsOf(HOME).find(key => key !== NEW_HOME), `second free hex beside town ${HOME}`)
  const schoolTiles = { [SCHOOL_AT]: school(), [startOf(HOME)]: fullResidence(), [NEW_HOME]: residence() }
  const schoolCity = (tiles: VotesState['tiles']) => beginHousing(withTiles(newGame(), { ...schoolTiles, ...tiles }))

  it('takes people waiting at another city’s Station', () => {
    // They may still move into their own city's empty Residence instead.
    const state = schoolCity({ [stationOf(NEXT)]: station(['grey']) })
    const moves = housingMoves(state)
    expect(moves.every(move => move.from === stationOf(NEXT))).toBe(true)
    expect(moves.map(move => move.to).sort()).toEqual([startOf(NEXT), NEW_HOME].sort())
  })

  it('takes people living in a city with no School', () => {
    const state = schoolCity({ [startOf(NEXT)]: residence(['grey']) })
    expect(housingMoves(state)).toEqual([moveTo(startOf(NEXT), NEW_HOME)])
  })

  it('leaves people living in another city with a School', () => {
    const otherSchool = must(soloNeighborsOf(NEXT)[0], `free hex beside town ${NEXT}`)
    const state = schoolCity({ [startOf(NEXT)]: residence(['grey']), [otherSchool]: school() })
    expect(housingMoves(state)).toEqual([])
  })

  it('never moves its own people between its Residences', () => {
    const state = schoolCity({ [startOf(HOME)]: residence(['grey']) })
    expect(housingMoves(state)).toEqual([])
  })

  it('doesn’t open other cities’ Residences to its own Station', () => {
    const state = schoolCity({ [NEW_HOME]: fullResidence(), [stationOf(HOME)]: station(['grey']) })
    expect(housingMoves(state)).toEqual([])
  })

  it('pulls people in by itself, since housing is mandatory', () => {
    const board = withTiles(newGame(), { [startOf(HOME)]: fullResidence(), [NEW_HOME]: residence(), [startOf(NEXT)]: residence(['grey']) })
    const state = applyMove(withBag(board, {}), { kind: 'place', tile: 'school', at: SCHOOL_AT })
    expect(state.tiles[NEW_HOME]).toEqual(residence(['grey']))
    expect(state.tiles[startOf(NEXT)]).toEqual(residence())
  })
})

describe('votes for housing', () => {
  const votesOf = (state: VotesState) => state.bag.pink ?? 0

  it('adds one of the active player’s cubes to the bag per person who moves in', () => {
    const state = housing({ [stationOf(HOME)]: station(['grey', 'grey']), [NEW_HOME]: residence() })
    const first = house(state, moveTo(stationOf(HOME), NEW_HOME))
    expect(votesOf(first) - votesOf(state)).toBe(1)
    expect(votesOf(house(first, moveTo(stationOf(HOME), NEW_HOME))) - votesOf(state)).toBe(2)
  })

  it('records who earned the cube', () => {
    const state = housing({ [stationOf(HOME)]: station(['grey']), [NEW_HOME]: residence() })
    expect(house(state, moveTo(stationOf(HOME), NEW_HOME)).log.at(-1)).toMatchObject({ kind: 'housed', voter: 'pink' })
  })
})

describe('the housing log', () => {
  it('records each move as a housed entry, not as the move itself', () => {
    const state = housing({ [stationOf(HOME)]: station(['grey']), [NEW_HOME]: residence() })
    const entry = applyMove(state, { kind: 'house', ...moveTo(stationOf(HOME), NEW_HOME) }).log.at(-1)
    expect(entry).toMatchObject({ kind: 'housed', from: stationOf(HOME), to: NEW_HOME, color: 'grey' })
  })
})

describe('housing in a turn', () => {
  // Pink places a Factory beside NEXT's tiles, which brings 3 people to NEXT's Station. A
  // bag of vermillion cubes keeps the draws certain.
  const factoryAt = soloNeighborOf(NEXT)
  const placeFactory = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', at: factoryAt })

  it('moves people in by itself when there is only one way to', () => {
    const state = placeFactory(withBag(newGame(), { vermillion: 3 }))
    expect(state.tiles[startOf(NEXT)]).toEqual(residence(['vermillion', 'vermillion', 'vermillion']))
  })

  it('pays one vote for each person who moved in', () => {
    const board = withBag(newGame(), { vermillion: 3 })
    expect(placeFactory(board).bag.pink).toBe(3)
  })

  it('asks the active player when there is a choice', () => {
    const secondHome = must(soloNeighborsOf(NEXT).find(key => key !== factoryAt), `second free hex beside town ${NEXT}`)
    const state = placeFactory(withBag(withTiles(newGame(), { [secondHome]: residence() }), { vermillion: 3 }))
    expect(state.phase).toEqual({ kind: 'housing' })
  })

  it('leaves people waiting when no Residence has space', () => {
    const board = withTiles(newGame(), { [startOf(NEXT)]: fullResidence() })
    expect(placeFactory(withBag(board, { vermillion: 3 })).tiles[stationOf(NEXT)]).toEqual(
      station(['vermillion', 'vermillion', 'vermillion']),
    )
  })

  it('moves people left waiting into new space on a later turn', () => {
    const waiting = withTiles(newGame(), {
      [startOf(NEXT)]: fullResidence(),
      [stationOf(NEXT)]: station(['vermillion']),
    })
    const state = applyMove(waiting, { kind: 'place', tile: 'residence', at: factoryAt })
    expect(state.tiles[factoryAt]).toEqual(residence(['vermillion']))
  })
})
