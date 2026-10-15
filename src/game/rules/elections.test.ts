import { describe, expect, it } from 'vitest'
import { awardSeats, cityScorers } from './elections'
import type { CubeColor, PlayerColor } from './types'

const TURN_ORDER: PlayerColor[] = ['pink', 'vermillion', 'blue']

const winners = (families: Partial<Record<CubeColor, number>>, seats: number) =>
  awardSeats(families, seats, TURN_ORDER).map(award => award.color)

describe('awarding seats', () => {
  it('gives each seat to the colour with the most cubes left', () => {
    expect(winners({ vermillion: 3, pink: 1 }, 3)).toEqual(['vermillion', 'vermillion', 'pink'])
  })

  it('breaks a tie for the colour that didn’t take the last seat', () => {
    const awards = awardSeats({ vermillion: 2, pink: 1 }, 2, TURN_ORDER)
    expect(awards[1]).toEqual({ color: 'pink', reason: 'didNotTakeLastSeat' })
  })

  it('gives a tied seat to the largest colour outside the tie', () => {
    const awards = awardSeats({ vermillion: 2, pink: 2, blue: 1 }, 1, TURN_ORDER)
    expect(awards[0]).toEqual({ color: 'blue', reason: 'compromise' })
  })

  it('falls back to turn order when the compromise is tied too', () => {
    const awards = awardSeats({ vermillion: 2, blue: 2, pink: 1, grey: 1 }, 1, TURN_ORDER)
    expect(awards[0]).toEqual({ color: 'vermillion', reason: 'playerOrder' })
  })

  it('lets grey cubes win seats', () => {
    expect(winners({ grey: 2, vermillion: 1 }, 1)).toEqual(['grey'])
  })

  it('leaves seats empty once no cubes are left', () => {
    expect(winners({ vermillion: 1 }, 3)).toEqual(['vermillion'])
  })

  it('never makes a colour with no cubes left the compromise', () => {
    // After pink's seat, vermillion and blue tie on 1 and pink has 0.
    const awards = awardSeats({ blue: 1, vermillion: 1, pink: 1 }, 3, TURN_ORDER)
    expect(awards.map(award => award.color)).toEqual(['pink', 'vermillion', 'blue'])
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
