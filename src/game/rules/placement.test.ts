import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { legalPlacements, placeTile, schoolBonusAt } from './placement'
import { newGame, residence, school, station, withTiles } from './testStates'

describe('legal placements', () => {
  it('allows a tile next to a tile in its own district', () => {
    expect(legalPlacements(newGame(), 'residence')).toContain('4,1')
  })

  it('refuses a hex that only touches another district across a rail', () => {
    // [6, 1] is in C; its only neighbouring tile is B's printed Residence.
    expect(legalPlacements(newGame(), 'residence')).not.toContain('6,1')
  })

  it('only lets a Station go beside a rail', () => {
    const state = withTiles(newGame(), { '4,1': school() })
    const stationHexes = legalPlacements(state, 'station')
    expect(stationHexes).toContain('5,2')
    expect(stationHexes).not.toContain('3,1')
  })

  it('keeps Factories away from Schools', () => {
    const state = withTiles(newGame(), { '4,1': school() })
    expect(legalPlacements(state, 'factory')).not.toContain('4,0')
    expect(legalPlacements(state, 'residence')).toContain('4,0')
  })

  it('offers nothing from an empty stock', () => {
    const state = newGame()
    const outOfStations = { ...state, players: state.players.map(player => ({ ...player, stationsLeft: 0 })) }
    expect(legalPlacements(outOfStations, 'station')).toEqual([])
  })

  it('rejects an illegal hex', () => {
    expect(() => placeTile(newGame(), 'residence', '6,1')).toThrow(IllegalMoveError)
  })
})

describe('placing a tile', () => {
  it('takes a private tile from the active player’s stock', () => {
    const placed = placeTile(newGame(), 'residence', '4,1')
    expect(placed.players[0].residencesLeft).toBe(newGame().players[0].residencesLeft - 1)
    expect(placed.tiles['4,1']).toEqual(residence('vermillion'))
  })

  it('leaves the stock alone for a public tile', () => {
    const placed = placeTile(newGame(), 'factory', '4,1')
    expect(placed.players).toEqual(newGame().players)
  })
})

describe('School bonus', () => {
  // The rules-sheet example: E's printed Residence is already next to another School.
  const exampleBoard = withTiles(newGame(), {
    '8,7': residence(null, ['yellow', 'green', 'grey']),
    '8,8': station('blue'),
    '7,6': school(),
    '9,6': residence('pink', ['pink', 'blue']),
    '10,7': residence('green', ['green']),
  })

  it('counts families in neighbouring Residences not already next to a School', () => {
    expect(schoolBonusAt(exampleBoard, '9,7')).toBe(3)
  })

  it('adds the bonus cubes to the bag in the builder’s colour', () => {
    const placed = placeTile(exampleBoard, 'school', '9,7')
    expect(placed.bag.vermillion).toBe((exampleBoard.bag.vermillion ?? 0) + 3)
  })
})
