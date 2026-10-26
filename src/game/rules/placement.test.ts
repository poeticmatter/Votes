import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { hasAnyLegalPlacement, legalPlacements, placeableKinds, placeTile } from './placement'
import { filledColumns, newGame, residence } from './testStates'
import { hexTouchingNothing, hexTouchingOnly, HOME, mountainNextToTile, soloNeighborOf, startOf, stationOf } from './testMap'
import type { VotesState } from './types'

const withSupply = (state: VotesState, supply: Partial<VotesState['supply']>): VotesState => ({
  ...state,
  supply: { ...state.supply, ...supply },
})

describe('legal placements', () => {
  it('allows a hex touching a Residence', () => {
    expect(legalPlacements(newGame(), 'residence')).toContain(soloNeighborOf(HOME))
  })

  it('allows a hex touching only a Station', () => {
    expect(legalPlacements(newGame(), 'factory')).toContain(hexTouchingOnly(stationOf(HOME)))
  })

  it('allows a hex touching a tile that was placed', () => {
    const state = { ...placeTile(newGame(), 'factory', soloNeighborOf(HOME)), phase: { kind: 'placement' as const } }
    const placed = state.turn.placedAt
    const before = legalPlacements(newGame(), 'residence')
    expect(legalPlacements(state, 'residence').some(key => key !== placed && !before.includes(key))).toBe(true)
  })

  it('refuses a hex touching no tile', () => {
    expect(legalPlacements(newGame(), 'residence')).not.toContain(hexTouchingNothing())
  })

  it('refuses a mountain for every tile but a Mine', () => {
    for (const kind of ['residence', 'factory', 'school'] as const) {
      expect(legalPlacements(newGame(), kind)).not.toContain(mountainNextToTile())
    }
  })

  it('allows a Mine on a mountain touching a tile', () => {
    expect(legalPlacements(newGame(), 'mine')).toContain(mountainNextToTile())
  })

  it('refuses a Mine on an open hex', () => {
    expect(legalPlacements(newGame(), 'mine')).not.toContain(soloNeighborOf(HOME))
  })

  it('refuses a hex that is taken', () => {
    expect(legalPlacements(newGame(), 'residence')).not.toContain(startOf(HOME))
    expect(legalPlacements(newGame(), 'residence')).not.toContain(stationOf(HOME))
  })

  it('has no placement of a kind once the supply has none left', () => {
    expect(legalPlacements(withSupply(newGame(), { school: 0 }), 'school')).toEqual([])
    expect(placeableKinds(withSupply(newGame(), { school: 0 }))).not.toContain('school')
  })

  it('has no placement once every tile is used up', () => {
    expect(hasAnyLegalPlacement(withSupply(newGame(), { residence: 0, factory: 0, mine: 0, school: 0 }))).toBe(false)
  })

  it('still has a Mine to place once the open hexes are full', () => {
    const full = filledColumns(newGame(), () => true)
    expect(placeableKinds(full)).toEqual(['mine'])
  })

  it('rejects an illegal hex', () => {
    expect(() => placeTile(newGame(), 'residence', hexTouchingNothing())).toThrow(IllegalMoveError)
  })

  it('rejects a kind the supply has run out of', () => {
    expect(() => placeTile(withSupply(newGame(), { residence: 0 }), 'residence', soloNeighborOf(HOME))).toThrow(IllegalMoveError)
  })
})

describe('placing a tile', () => {
  it('puts down an empty Residence', () => {
    const at = soloNeighborOf(HOME)
    expect(placeTile(newGame(), 'residence', at).tiles[at]).toEqual(residence())
  })

  it('takes the tile from the supply', () => {
    const state = newGame()
    expect(placeTile(state, 'school', soloNeighborOf(HOME)).supply.school).toBe(state.supply.school - 1)
  })

  it('remembers where it went', () => {
    const at = soloNeighborOf(HOME)
    expect(placeTile(newGame(), 'school', at).turn.placedAt).toBe(at)
  })
})
