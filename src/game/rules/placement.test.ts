import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { hasAnyLegalPlacement, legalPlacements, placeTile } from './placement'
import { filledColumns, newGame, residence } from './testStates'

describe('legal placements', () => {
  it('allows a hex touching a Residence', () => {
    // [4, 1] touches B's Residence at [5, 1].
    expect(legalPlacements(newGame())).toContain('4,1')
  })

  it('allows a hex touching only a Station', () => {
    // [6, 0] touches B's Station at [5, 0] and nothing else.
    expect(legalPlacements(newGame())).toContain('6,0')
  })

  it('allows a hex touching a tile that was placed', () => {
    const state = placeTile(newGame(), 'factory', '4,1')
    expect(legalPlacements({ ...state, phase: { kind: 'placement' } })).toContain('3,1')
  })

  it('refuses a hex touching no tile', () => {
    expect(legalPlacements(newGame())).not.toContain('3,3')
  })

  it('refuses a mountain', () => {
    // [9, 1] touches C's Residence, but it is a mountain.
    expect(legalPlacements(newGame())).not.toContain('9,1')
  })

  it('refuses a hex that is taken', () => {
    expect(legalPlacements(newGame())).not.toContain('5,1')
    expect(legalPlacements(newGame())).not.toContain('5,0')
  })

  it('has no placement once the board is full', () => {
    const full = filledColumns(newGame(), () => true)
    expect(hasAnyLegalPlacement(full)).toBe(false)
  })

  it('rejects an illegal hex', () => {
    expect(() => placeTile(newGame(), 'residence', '3,3')).toThrow(IllegalMoveError)
  })
})

describe('placing a tile', () => {
  it('puts down an empty Residence', () => {
    expect(placeTile(newGame(), 'residence', '4,1').tiles['4,1']).toEqual(residence())
  })

  it('remembers where it went', () => {
    expect(placeTile(newGame(), 'school', '4,1').turn.placedAt).toBe('4,1')
  })
})
