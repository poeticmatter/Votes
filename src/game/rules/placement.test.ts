import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { legalPlacements, placeableKinds, placeTile } from './placement'
import { newGame, residence, school, tilesOn, withTiles, withTilesInHand } from './testStates'
import {
  chainBetween,
  chainWithGap,
  hexTouchingNothing,
  hexTouchingOnly,
  HOME,
  mountainNextToTile,
  NEXT,
  soloNeighborOf,
  soloNeighborsOf,
  startOf,
} from './testMap'

// The active player starts with 2 Residence tiles in their own supply.
const withEverything = () => withTilesInHand(newGame(), { factory: 1, school: 1 })

describe('legal placements', () => {
  it('allows a hex touching a Residence', () => {
    expect(legalPlacements(newGame(), 'residence')).toContain(soloNeighborOf(HOME))
  })

  it('allows a hex touching only a town’s starting Residence', () => {
    expect(legalPlacements(withEverything(), 'factory')).toContain(hexTouchingOnly(startOf(HOME)))
  })

  it('only offers tiles from the player’s own supply', () => {
    expect(legalPlacements(newGame(), 'factory')).toEqual([])
    expect(placeableKinds(newGame())).toEqual(['residence'])
  })

  it('refuses a hex touching no tile', () => {
    expect(legalPlacements(newGame(), 'residence')).not.toContain(hexTouchingNothing())
  })

  it('refuses a mountain for every tile', () => {
    for (const kind of ['residence', 'factory', 'school'] as const) {
      expect(legalPlacements(withEverything(), kind)).not.toContain(mountainNextToTile())
    }
  })

  it('refuses a hex that is taken', () => {
    expect(legalPlacements(newGame(), 'residence')).not.toContain(startOf(HOME))
  })

  it('refuses a School in a city that already has one', () => {
    const [first, second] = soloNeighborsOf(HOME)
    const withSchool = withTiles(withEverything(), { [first]: school() })
    expect(legalPlacements(withSchool, 'school')).not.toContain(second)
    expect(legalPlacements(withSchool, 'residence')).toContain(second)
  })

  it('refuses a School that would join a city that has one', () => {
    const chain = chainBetween(HOME, NEXT)
    const { filled, gap } = chainWithGap(chain)
    const board = withTiles(withEverything(), { ...tilesOn(filled, residence), [chain[0]]: school() })
    expect(legalPlacements(board, 'school')).not.toContain(gap)
    expect(legalPlacements(board, 'residence')).toContain(gap)
  })
})

describe('placing a tile', () => {
  const at = soloNeighborOf(HOME)

  it('puts a Residence down face down, holding nobody', () => {
    expect(placeTile(newGame(), 'residence', at).tiles[at]).toEqual({ kind: 'residence', isFaceDown: true, people: [] })
  })

  it('puts a Factory down face down', () => {
    expect(placeTile(withEverything(), 'factory', at).tiles[at]).toEqual({ kind: 'factory', isFaceDown: true })
  })

  it('puts a School down face up', () => {
    expect(placeTile(withEverything(), 'school', at).tiles[at]).toEqual({ kind: 'school', isUniversity: false })
  })

  it('takes the tile from the player’s own supply', () => {
    expect(placeTile(newGame(), 'residence', at).players[0].supply.residence).toBe(1)
  })

  it('remembers where it went', () => {
    expect(placeTile(newGame(), 'residence', at).turn.placedAt).toBe(at)
  })

  it('rejects a tile the player doesn’t have', () => {
    expect(() => placeTile(newGame(), 'school', at)).toThrow(IllegalMoveError)
  })

  it('rejects an illegal hex', () => {
    expect(() => placeTile(newGame(), 'residence', hexTouchingNothing())).toThrow(IllegalMoveError)
  })
})
