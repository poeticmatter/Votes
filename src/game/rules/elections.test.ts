import { describe, expect, it } from 'vitest'
import { cityScorers, countVotes, seatWinner } from './elections'
import { factory, newGame, residence, withTiles } from './testStates'
import type { PlayerColor } from './types'

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

  it('counts for nobody when empty', () => {
    expect(seatWinner([])).toEqual({ winner: null, reason: 'empty' })
  })
})

describe('a city’s vote', () => {
  // City C: its starting Residence at [9, 2], another at [10, 2] and Factories at
  // [10, 3], which borders the rail, and [8, 3], which doesn't. B's Residence is in
  // another city.
  const board = withTiles(newGame(), {
    '9,2': residence(['pink', 'pink']),
    '10,2': residence(['vermillion', 'pink']),
    '10,3': factory(),
    '8,3': factory(),
    '5,1': residence(['vermillion', 'vermillion']),
  })
  const result = countVotes(board, ['C'])

  it('makes every Residence in the city a seat', () => {
    expect(result.seats).toHaveLength(2)
  })

  it('gives a tied seat to the colour furthest left', () => {
    expect(result.seats.map(seat => seat.winner)).toEqual(['pink', 'vermillion'])
    expect(result.seatsByColor).toEqual({ pink: 1, vermillion: 1 })
  })

  it('scores the city’s Factories, 2 for one beside the rail', () => {
    expect(result.factoryPoints).toBe(3)
  })
})

describe('city payout', () => {
  const players: PlayerColor[] = ['pink', 'vermillion']

  it('pays the player with the most seats', () => {
    expect(cityScorers({ pink: 2, vermillion: 1 }, players)).toEqual(['pink'])
  })

  it('pays every tied player', () => {
    expect(cityScorers({ pink: 1, vermillion: 1 }, players)).toEqual(['pink', 'vermillion'])
  })

  it('pays nobody when grey leads', () => {
    expect(cityScorers({ grey: 2, vermillion: 1 }, players)).toEqual([])
  })

  it('still pays players who tie with grey', () => {
    expect(cityScorers({ grey: 1, vermillion: 1 }, players)).toEqual(['vermillion'])
  })

  it('pays nobody when no player holds a seat', () => {
    expect(cityScorers({}, players)).toEqual([])
  })
})
