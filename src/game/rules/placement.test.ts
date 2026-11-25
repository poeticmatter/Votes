import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { legalPlacements, placeableKinds, placeTile } from './placement'
import { newGame, residence, school, tilesOn, withHand, withTiles } from './testStates'
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

describe('legal placements', () => {
  it('allows a hex touching a Residence', () => {
    expect(legalPlacements(newGame(), 'residence')).toContain(soloNeighborOf(HOME))
  })

  it('allows a hex touching only a town’s starting Residence', () => {
    expect(legalPlacements(newGame(), 'factory')).toContain(hexTouchingOnly(startOf(HOME)))
  })

  it('only offers tiles from the player’s own supply', () => {
    expect(placeableKinds(withHand(newGame(), { residence: 1 }))).toEqual(['residence'])
  })

  it('refuses a hex touching no tile', () => {
    expect(legalPlacements(newGame(), 'residence')).not.toContain(hexTouchingNothing())
  })

  it('refuses a mountain for every tile', () => {
    for (const kind of ['residence', 'factory', 'school'] as const) {
      expect(legalPlacements(newGame(), kind)).not.toContain(mountainNextToTile())
    }
  })

  it('refuses a hex that is taken', () => {
    expect(legalPlacements(newGame(), 'residence')).not.toContain(startOf(HOME))
  })

  it('refuses a School in a city that already has one', () => {
    const [first, second] = soloNeighborsOf(HOME)
    const withSchool = withTiles(newGame(), { [first]: school('vermillion') })
    expect(legalPlacements(withSchool, 'school')).not.toContain(second)
    expect(legalPlacements(withSchool, 'residence')).toContain(second)
  })

  it('refuses a School that would join a city that has one', () => {
    const chain = chainBetween(HOME, NEXT)
    const { filled, gap } = chainWithGap(chain)
    const board = withTiles(newGame(), { ...tilesOn(filled, () => residence()), [chain[0]]: school('vermillion') })
    expect(legalPlacements(board, 'school')).not.toContain(gap)
    expect(legalPlacements(board, 'residence')).toContain(gap)
  })
})

describe('placing a tile', () => {
  const at = soloNeighborOf(HOME)

  it('puts down a Residence owned by the placer, holding nobody', () => {
    expect(placeTile(newGame(), 'residence', at).tiles[at]).toEqual(residence([], 'pink'))
  })

  it('puts down a School owned by the placer', () => {
    expect(placeTile(newGame(), 'school', at).tiles[at]).toEqual(school('pink'))
  })

  it('takes the tile from the player’s own supply', () => {
    expect(placeTile(newGame(), 'residence', at).players[0].supply.residence).toBe(newGame().players[0].supply.residence - 1)
  })

  it('remembers where it went', () => {
    expect(placeTile(newGame(), 'residence', at).turn.placedAt).toBe(at)
  })

  it('rejects a tile the player doesn’t have', () => {
    expect(() => placeTile(withHand(newGame(), { residence: 1 }), 'school', at)).toThrow(IllegalMoveError)
  })

  it('rejects an illegal hex', () => {
    expect(() => placeTile(newGame(), 'residence', hexTouchingNothing())).toThrow(IllegalMoveError)
  })
})
