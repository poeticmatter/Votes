import { describe, expect, it } from 'vitest'
import { countVotes, seatWinner } from './elections'
import { HOME, NEXT, soloNeighborOf, startOf, townHexes, townSpots } from './testMap'
import { faceDownFactory, factory, newGame, residence, withTiles } from './testStates'

describe('a Residence’s seat', () => {
  it('goes to the colour with the most people on it', () => {
    expect(seatWinner(['vermillion', 'vermillion', 'pink'])).toEqual({ winner: 'vermillion', reason: 'mostPeople' })
  })

  it('ignores grey people, who never vote, however many there are', () => {
    expect(seatWinner(['grey', 'grey', 'pink'])).toEqual({ winner: 'pink', reason: 'mostPeople' })
  })

  it('goes to the tied colour furthest left', () => {
    expect(seatWinner(['vermillion', 'pink'])).toEqual({ winner: 'vermillion', reason: 'leftmostOfTie' })
    expect(seatWinner(['pink', 'vermillion', 'vermillion', 'pink'])).toEqual({ winner: 'pink', reason: 'leftmostOfTie' })
  })

  it('breaks a tie between the voters only, skipping grey people to their left', () => {
    expect(seatWinner(['grey', 'vermillion', 'pink'])).toEqual({ winner: 'vermillion', reason: 'leftmostOfTie' })
  })

  it('belongs to nobody when empty', () => {
    expect(seatWinner([])).toEqual({ winner: null, reason: 'noVoters' })
  })

  it('belongs to nobody when only grey people live there', () => {
    expect(seatWinner(['grey', 'grey'])).toEqual({ winner: null, reason: 'noVoters' })
  })
})

describe('a city’s vote', () => {
  // HOME gets a second Residence, a face-up Factory and a face-down one. The first
  // Residence holds 2 pink; the second a vermillion and a pink, tied, so the vermillion on
  // the left takes it. NEXT's Residence is in another city, as is a Factory beside it.
  const [faceUp, faceDown, other] = townSpots(HOME)
  const board = withTiles(newGame(), {
    [startOf(HOME)]: residence(['pink', 'pink']),
    [other]: residence(['vermillion', 'pink']),
    [faceUp]: factory(),
    [faceDown]: faceDownFactory(),
    [startOf(NEXT)]: residence(['vermillion', 'vermillion']),
    [soloNeighborOf(NEXT)]: factory(),
  })
  const result = countVotes(board, [HOME])
  // Any Factory printed beside HOME is in its city too, face up.
  const printed = townHexes(HOME).filter(key => board.tiles[key]?.kind === 'factory').length

  it('makes every Residence in the city a seat', () => {
    expect(result.seats.map(seat => seat.residence).sort()).toEqual([startOf(HOME), other].sort())
  })

  it('gives a tied seat to the colour furthest left', () => {
    expect(result.seatsByColor).toEqual({ pink: 1, vermillion: 1 })
  })

  it('pays 1 point per seat for each face-up Factory in the city, and nothing for face-down ones', () => {
    expect(result.pointsPerSeat).toBe(1 + printed)
  })

  it('pays every player for each seat they hold', () => {
    expect(result.scores).toEqual({ pink: result.pointsPerSeat, vermillion: result.pointsPerSeat })
  })

  it('pays nobody for grey or empty seats', () => {
    const withGrey = withTiles(board, { [other]: residence(['grey']), [startOf(HOME)]: residence() })
    expect(countVotes(withGrey, [HOME]).scores).toEqual({})
  })

  it('pays nothing in a city with no face-up Factory', () => {
    const noFactories = withTiles(board, { [faceUp]: faceDownFactory() })
    expect(countVotes(noFactories, [HOME]).pointsPerSeat).toBe(printed)
  })
})
