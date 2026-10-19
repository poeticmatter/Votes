import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { beginHousing, house, housingMoves, housingVotes } from './housing'
import { applyMove } from './turnFlow'
import { factory, newGame, residence, station, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

// The rail passes the Stations in the order E, C, B, A, D, so E's Station is one stop
// from C's, C's from B's, and so on. Pink is the active player.
const STATION_E = '7,6'
const START_E = '8,7'
const NEW_E = '8,6'
const START_C = '9,2'
const STATION_C = '9,3'
const START_B = '5,1'
const START_A = '1,2'

const full = residence(['grey', 'grey', 'grey'])

/** Everyone else's Residences are full, so the tests decide where room is. */
function housing(tiles: VotesState['tiles']): VotesState {
  const crowded = { [START_E]: full, [START_C]: full, [START_B]: full, [START_A]: full, '1,7': full }
  return beginHousing(withTiles(newGame(), { ...crowded, ...tiles }))
}

const moveTo = (from: string, to: string) => ({ from, color: 'grey' as const, to })

describe('where waiting people can move in', () => {
  it('offers Residences with space in the Station’s city', () => {
    const state = housing({ [STATION_E]: station(['grey']), [NEW_E]: residence() })
    expect(housingMoves(state)).toEqual([{ ...moveTo(STATION_E, NEW_E) }])
  })

  it('offers Residences in a city one stop away along the rail', () => {
    const state = housing({ [STATION_E]: station(['grey']), [START_C]: residence() })
    expect(housingMoves(state)).toEqual([moveTo(STATION_E, START_C)])
  })

  it('refuses a city two stops away', () => {
    const state = housing({ [STATION_E]: station(['grey']), [START_B]: residence() })
    expect(housingMoves(state)).toEqual([])
    expect(() => house(state, moveTo(STATION_E, START_B))).toThrow(IllegalMoveError)
  })

  it('reaches stops in both directions', () => {
    const state = housing({ [STATION_C]: station(['grey']), [START_E]: residence(), [START_B]: residence() })
    expect(housingMoves(state).map(move => move.to)).toEqual([START_B, START_E])
  })

  it('does not offer a full Residence', () => {
    expect(housingMoves(housing({ [STATION_E]: station(['grey']) }))).toEqual([])
  })

  it('reaches every Residence of a merged city, however far along the rail', () => {
    // Factories at [1, 4] to [1, 6] join A to D, so A's Residence is in D's city.
    const chain = { '1,4': factory(), '1,5': factory(), '1,6': factory() }
    const state = housing({ ...chain, '2,7': station(['grey']), [START_A]: residence() })
    expect(housingMoves(state)).toEqual([moveTo('2,7', START_A)])
  })
})

describe('votes for housing', () => {
  const votesOf = (state: VotesState) => state.bag.pink ?? 0

  it('adds one of the active player’s cubes to the bag per person housed in the city', () => {
    const state = housing({ [STATION_E]: station(['grey']), [NEW_E]: residence() })
    expect(votesOf(house(state, moveTo(STATION_E, NEW_E))) - votesOf(state)).toBe(1)
  })

  it('adds one fewer for the first person from a Station one stop away', () => {
    const state = housing({ [STATION_C]: station(['grey', 'grey']), [START_B]: residence() })
    expect(housingVotes(state, moveTo(STATION_C, START_B))).toBe(0)
  })

  it('charges that Station only once a turn', () => {
    const state = housing({ [STATION_C]: station(['grey', 'grey']), [START_B]: residence() })
    const first = house(state, moveTo(STATION_C, START_B))
    expect(votesOf(first)).toBe(votesOf(state))
    expect(housingVotes(first, moveTo(STATION_C, START_B))).toBe(1)
    expect(votesOf(house(first, moveTo(STATION_C, START_B)))).toBe(votesOf(state) + 1)
  })

  it('charges each Station one stop away', () => {
    const state = housing({
      [STATION_C]: station(['grey']),
      [STATION_E]: station(['grey']),
      [START_B]: residence(),
      '8,6': residence(),
    })
    // C's person goes one stop to B's Residence; E's person is in E's own city for [8, 6].
    const afterC = house(state, moveTo(STATION_C, START_B))
    expect(votesOf(afterC)).toBe(votesOf(state))
    expect(votesOf(house(afterC, moveTo(STATION_E, '8,6'))) - votesOf(afterC)).toBe(1)
  })

  it('records the cost in the log', () => {
    const state = housing({ [STATION_C]: station(['grey']), [START_B]: residence() })
    const entry = house(state, moveTo(STATION_C, START_B)).log.at(-1)
    expect(entry).toMatchObject({ kind: 'housed', isRemote: true, votes: 0, voter: 'pink' })
  })
})

describe('the housing log', () => {
  it('records each move as a housed entry, not as the move itself', () => {
    const state = housing({ [STATION_E]: station(['grey']), [NEW_E]: residence() })
    const entry = applyMove(state, { kind: 'house', ...moveTo(STATION_E, NEW_E) }).log.at(-1)
    expect(entry).toMatchObject({ kind: 'housed', from: STATION_E, to: NEW_E, color: 'grey', votes: 1, isRemote: false })
  })
})

describe('housing in a turn', () => {
  // Pink places a Factory at [10, 2], beside C's Residence, which brings 3 people to
  // C's Station. A bag of vermillion cubes keeps the draws certain.
  const placeFactory = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', at: '10,2' })
  const crowdedElsewhere = { [START_E]: full, [START_B]: full }

  it('moves people in by itself when there is only one way to', () => {
    const state = placeFactory(withBag(withTiles(newGame(), crowdedElsewhere), { vermillion: 3 }))
    expect(state.tiles[START_C]).toEqual(residence(['vermillion', 'vermillion', 'vermillion']))
  })

  it('pays one vote for each person who moved in', () => {
    const board = withBag(withTiles(newGame(), crowdedElsewhere), { vermillion: 3 })
    expect(placeFactory(board).bag.pink).toBe(3)
  })

  it('asks the active player when there is a choice', () => {
    const state = placeFactory(withBag(newGame(), { vermillion: 3 }))
    expect(state.phase).toEqual({ kind: 'housing' })
  })

  it('leaves people waiting when no Residence has space', () => {
    const board = withTiles(newGame(), { ...crowdedElsewhere, [START_C]: full })
    expect(placeFactory(withBag(board, { vermillion: 3 })).tiles[STATION_C]).toEqual(
      station(['vermillion', 'vermillion', 'vermillion']),
    )
  })

  it('moves people left waiting into new space on a later turn', () => {
    const waiting = withTiles(newGame(), { ...crowdedElsewhere, [START_C]: full, [STATION_C]: station(['vermillion']) })
    const state = applyMove(waiting, { kind: 'place', tile: 'residence', at: '10,2' })
    expect(state.tiles['10,2']).toEqual(residence(['vermillion']))
  })
})
