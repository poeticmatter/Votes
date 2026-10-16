import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { legalPlacements, placeTile } from './placement'
import { newGame, residence, school, station, withTiles } from './testStates'

describe('legal placements', () => {
  it('allows a tile next to a tile in its own district', () => {
    expect(legalPlacements(newGame(), 'residence')).toContain('4,1')
  })

  it('refuses a hex that only touches another district across a rail', () => {
    // [6, 1] is in C; its only neighbouring tile is B's printed Residence.
    expect(legalPlacements(newGame(), 'residence')).not.toContain('6,1')
  })

  it('only lets a Station go on a station site', () => {
    // Both touch B's printed Residence and border a rail; only [5, 0] is a site.
    const stationHexes = legalPlacements(newGame(), 'station')
    expect(stationHexes).toContain('5,0')
    expect(stationHexes).not.toContain('5,2')
  })

  it('leaves a 4+ station site unused with fewer players', () => {
    const besideSite = { '4,2': residence('pink') }
    expect(legalPlacements(withTiles(newGame(3), besideSite), 'station')).not.toContain('4,3')
    expect(legalPlacements(withTiles(newGame(4), besideSite), 'station')).toContain('4,3')
  })

  it('keeps a station site in use for Stations', () => {
    expect(legalPlacements(newGame(), 'residence')).not.toContain('5,0')
  })

  it('treats a station site not in use as an ordinary hex', () => {
    const besideSite = { '4,2': residence('pink') }
    expect(legalPlacements(withTiles(newGame(3), besideSite), 'residence')).toContain('4,3')
  })

  it('lets a Factory go next to a School', () => {
    expect(legalPlacements(withTiles(newGame(), { '4,1': school() }), 'factory')).toContain('4,0')
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
    expect(placed.tiles['4,1']).toEqual(residence('pink'))
  })

  it('puts down an empty Station in the player’s colour', () => {
    expect(placeTile(newGame(), 'station', '5,0').tiles['5,0']).toEqual(station('pink'))
  })

  it('leaves the stock alone for a public tile', () => {
    const placed = placeTile(newGame(), 'factory', '4,1')
    expect(placed.players).toEqual(newGame().players)
  })
})
