import { describe, expect, it } from 'vitest'
import { cityScorers, countVotes, seatWinner } from './elections'
import { factory, newGame, residence, withTiles } from './testStates'
import type { CubeColor, PlayerColor, ResidenceTile } from './types'

const residenceTile = (owner: PlayerColor | null, people: CubeColor[]): ResidenceTile => ({ kind: 'residence', owner, people })

describe('a Residence’s seat', () => {
  it('goes to the colour with the most people on it', () => {
    expect(seatWinner(residenceTile('pink', ['vermillion', 'vermillion', 'pink']))).toEqual({ winner: 'vermillion', reason: 'mostPeople' })
  })

  it('goes to the owner on a tie', () => {
    expect(seatWinner(residenceTile('pink', ['vermillion', 'grey']))).toEqual({ winner: 'pink', reason: 'tieToOwner' })
  })

  it('goes to grey on a tie in a printed Residence', () => {
    expect(seatWinner(residenceTile(null, ['vermillion', 'pink']))).toEqual({ winner: 'grey', reason: 'tieToGrey' })
  })

  it('goes to the owner of an empty Residence, a 0–0 tie', () => {
    expect(seatWinner(residenceTile('vermillion', []))).toEqual({ winner: 'vermillion', reason: 'tieToOwner' })
  })
})

describe('a city’s vote', () => {
  // City C: the printed Residence at [9, 2], vermillion's at [10, 2] and Factories at
  // [10, 3] and [8, 3], which borders the rail. B's printed Residence is elsewhere.
  const board = withTiles(newGame(), {
    '9,2': residence(null, ['pink', 'pink']),
    '10,2': residence('vermillion'),
    '10,3': factory(),
    '8,3': factory(),
    '5,1': residence(null, ['vermillion', 'vermillion']),
  })
  const result = countVotes(board, ['C'])

  it('makes every Residence in the city a seat', () => {
    expect(result.seatsByColor).toEqual({ pink: 1, vermillion: 1 })
  })

  it('scores the city’s Factories, 2 for one beside a rail', () => {
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
