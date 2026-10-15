import { describe, expect, it } from 'vitest'
import { awardSeats, cityScorers } from './elections'
import type { CubeColor, PlayerColor } from './types'

const TURN_ORDER: PlayerColor[] = ['vermillion', 'blue', 'yellow']

const winners = (families: Partial<Record<CubeColor, number>>, seats: number) =>
  awardSeats(families, seats, TURN_ORDER).map(award => award.color)

describe('awarding seats', () => {
  it('gives each seat to the colour with the most cubes left', () => {
    expect(winners({ blue: 3, vermillion: 1 }, 3)).toEqual(['blue', 'blue', 'vermillion'])
  })

  it('breaks a tie for the colour that didn’t take the last seat', () => {
    const awards = awardSeats({ blue: 2, vermillion: 1 }, 2, TURN_ORDER)
    expect(awards[1]).toEqual({ color: 'vermillion', reason: 'didNotTakeLastSeat' })
  })

  it('gives a tied seat to the largest colour outside the tie', () => {
    const awards = awardSeats({ blue: 2, vermillion: 2, yellow: 1 }, 1, TURN_ORDER)
    expect(awards[0]).toEqual({ color: 'yellow', reason: 'compromise' })
  })

  it('falls back to turn order when the compromise is tied too', () => {
    const awards = awardSeats({ blue: 2, yellow: 2, vermillion: 1, grey: 1 }, 1, TURN_ORDER)
    expect(awards[0]).toEqual({ color: 'blue', reason: 'playerOrder' })
  })

  it('lets grey cubes win seats', () => {
    expect(winners({ grey: 2, blue: 1 }, 1)).toEqual(['grey'])
  })

  it('leaves seats empty once no cubes are left', () => {
    expect(winners({ blue: 1 }, 3)).toEqual(['blue'])
  })

  it('never makes a colour with no cubes left the compromise', () => {
    // After vermillion's seat, blue and yellow tie on 1 and vermillion has 0.
    const awards = awardSeats({ yellow: 1, blue: 1, vermillion: 1 }, 3, TURN_ORDER)
    expect(awards.map(award => award.color)).toEqual(['vermillion', 'blue', 'yellow'])
  })
})

describe('city payout', () => {
  const players: PlayerColor[] = ['vermillion', 'blue']

  it('pays the player with the most seats', () => {
    expect(cityScorers({ vermillion: 2, blue: 1 }, players)).toEqual(['vermillion'])
  })

  it('pays every tied player', () => {
    expect(cityScorers({ vermillion: 1, blue: 1 }, players)).toEqual(['vermillion', 'blue'])
  })

  it('pays nobody when grey leads', () => {
    expect(cityScorers({ grey: 2, blue: 1 }, players)).toEqual([])
  })

  it('still pays players who tie with grey', () => {
    expect(cityScorers({ grey: 1, blue: 1 }, players)).toEqual(['blue'])
  })

  it('pays nobody when no player holds a seat', () => {
    expect(cityScorers({}, players)).toEqual([])
  })
})
