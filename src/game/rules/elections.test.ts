import { describe, expect, it } from 'vitest'
import { BOARD } from '../map/board'
import { countVotes, seatWinner } from './elections'
import { industryValue } from './boardQueries'
import { pointsPerSeat } from './payout'
import { HOME, NEXT, soloNeighborOf, startOf, townHexes, townSpots } from './testMap'
import { factory, mine, newGame, residence, withTiles } from './testStates'

describe('a Residence’s seat', () => {
  it('goes to the colour with the most people on it', () => {
    expect(seatWinner(['vermillion', 'vermillion', 'pink'])).toEqual({ winner: 'vermillion', reason: 'mostPeople' })
  })

  it('goes to grey when grey has the most', () => {
    expect(seatWinner(['grey', 'grey', 'pink'])).toEqual({ winner: 'grey', reason: 'mostPeople' })
  })

  it('goes to the tied colour furthest left', () => {
    expect(seatWinner(['vermillion', 'pink'])).toEqual({ winner: 'vermillion', reason: 'leftmostOfTie' })
    expect(seatWinner(['pink', 'vermillion', 'vermillion', 'pink'])).toEqual({ winner: 'pink', reason: 'leftmostOfTie' })
  })

  it('can go to grey on a tie', () => {
    expect(seatWinner(['grey', 'pink'])).toEqual({ winner: 'grey', reason: 'leftmostOfTie' })
  })

  it('belongs to nobody when empty', () => {
    expect(seatWinner([])).toEqual({ winner: null, reason: 'empty' })
  })
})

describe('Factory and Mine values', () => {
  // An open hex beside a mountain, for a Factory and a Mine side by side.
  const pair = BOARD.hexes.flatMap(hex => {
    if (hex.terrain !== 'open') return []
    const mountain = hex.neighbors.find(neighbor => BOARD.hexByKey.get(neighbor.key)?.terrain === 'mountain')
    return mountain ? [{ open: hex.key, mountain: mountain.key }] : []
  })[0]

  it('makes a Mine worth 2', () => {
    expect(industryValue(newGame(), 'mine', pair.mountain)).toBe(2)
  })

  it('makes a Factory worth 1', () => {
    expect(industryValue(newGame(), 'factory', pair.open)).toBe(1)
  })

  it('adds 1 to a Factory touching a Mine', () => {
    const state = withTiles(newGame(), { [pair.mountain]: mine() })
    expect(industryValue(state, 'factory', pair.open)).toBe(2)
  })
})

describe('the payout table', () => {
  it('pays nothing for a city with no Factories or Mines', () => {
    expect(pointsPerSeat(0, 4)).toBe(0)
  })

  it('pays by the city’s value and its number of seats', () => {
    expect(pointsPerSeat(4, 2)).toBe(1)
    expect(pointsPerSeat(7, 4)).toBe(2)
    expect(pointsPerSeat(10, 3)).toBe(4)
    expect(pointsPerSeat(16, 10)).toBe(2)
    expect(pointsPerSeat(25, 11)).toBe(2)
    expect(pointsPerSeat(30, 2)).toBe(6)
  })

  it('pays less per seat as a city of the same value gains seats', () => {
    expect(pointsPerSeat(12, 3)).toBeGreaterThan(pointsPerSeat(12, 12))
  })
})

describe('a city’s vote', () => {
  // HOME gets a second Residence and two Factories, worth 2 in all. The first Residence
  // holds 2 pink; the second a vermillion and a pink, tied, so the vermillion on the left
  // takes it. NEXT's Residence is in another city, as is a Factory beside it.
  const [firstFactory, secondFactory, other] = townSpots(HOME)
  const board = withTiles(newGame(), {
    [startOf(HOME)]: residence(['pink', 'pink']),
    [other]: residence(['vermillion', 'pink']),
    [firstFactory]: factory(),
    [secondFactory]: factory(),
    [startOf(NEXT)]: residence(['vermillion', 'vermillion']),
    [soloNeighborOf(NEXT)]: factory(),
  })
  const result = countVotes(board, [HOME])

  it('makes every Residence in the city a seat', () => {
    expect(result.seats).toHaveLength(2)
  })

  it('gives a tied seat to the colour furthest left', () => {
    expect(result.seatsByColor).toEqual({ pink: 1, vermillion: 1 })
  })

  it('adds up the value of the city’s own Factories and Mines', () => {
    // Any Factory printed beside HOME is in its city too.
    const printed = townHexes(HOME).filter(key => board.tiles[key]?.kind === 'factory')
    const printedValue = printed.reduce((total, key) => total + industryValue(board, 'factory', key), 0)
    expect(result.cityValue).toBe(1 + 1 + printedValue)
  })

  it('pays every player for each seat they hold', () => {
    expect(result.pointsPerSeat).toBe(pointsPerSeat(result.cityValue, 2))
    expect(result.scores).toEqual({ pink: result.pointsPerSeat, vermillion: result.pointsPerSeat })
  })

  it('pays nobody for grey or empty seats, though they count as seats', () => {
    const withGrey = withTiles(board, { [other]: residence(['grey']), [startOf(HOME)]: residence() })
    const greyResult = countVotes(withGrey, [HOME])
    expect(greyResult.seats).toHaveLength(2)
    expect(greyResult.scores).toEqual({})
  })
})
