import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { legalPlacements, placeTile } from './placement'
import { factory, newGame, residence, withTiles } from './testStates'

// In newGame, A and D are sand, B and E sage, C slate. A's Station is at [1, 3] and D's
// Residence at [1, 7], with the lakeshore hexes [1, 4] to [1, 6] between them.

describe('legal placements', () => {
  it('allows a tile next to a tile of its colour', () => {
    // [4, 1] touches B's Residence.
    expect(legalPlacements(newGame(), 'sage')).toContain('4,1')
  })

  it('counts a town’s Station as a tile of its colour', () => {
    // [5, 0] is B's Station; [4, 0] touches only it.
    expect(legalPlacements(newGame(), 'sage')).toContain('4,0')
  })

  it('refuses a hex with no tile of that colour next to it', () => {
    expect(legalPlacements(newGame(), 'slate')).not.toContain('4,1')
  })

  it('allows a tile next to tiles of other colours too', () => {
    // [6, 1] touches B's sage Residence across the rail and C's slate tile at [7, 1].
    expect(legalPlacements(withTiles(newGame(), { '7,1': residence('C') }), 'slate')).toContain('6,1')
  })

  it('refuses a tile that would connect two towns of its colour', () => {
    const state = withTiles(newGame(), { '1,4': residence('A'), '1,6': residence('D') })
    expect(legalPlacements(state, 'sand')).not.toContain('1,5')
  })

  it('refuses a hex that is taken', () => {
    expect(legalPlacements(newGame(), 'sage')).not.toContain('5,1')
  })

  it('rejects an illegal hex', () => {
    expect(() => placeTile(newGame(), 'residence', 'slate', '4,1')).toThrow(IllegalMoveError)
  })
})

describe('placing a tile', () => {
  it('builds it onto the town it touches', () => {
    expect(placeTile(newGame(), 'factory', 'sage', '4,1').tiles['4,1']).toEqual(factory('B'))
  })

  it('puts down an empty Residence', () => {
    expect(placeTile(newGame(), 'residence', 'sand', '1,4').tiles['1,4']).toEqual(residence('A'))
  })
})
