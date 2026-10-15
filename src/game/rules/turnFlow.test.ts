import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { BOARD } from '../map/board'
import { applyMove, gameOutcome } from './turnFlow'
import { factory, newGame, residence, school, station, withBag, withTiles } from './testStates'
import type { Tile, VotesState } from './types'

describe('a quiet turn', () => {
  it('passes play to the next player when no Station can bring anyone', () => {
    const state = applyMove(newGame(), { kind: 'place', tile: 'residence', at: '4,1' })
    expect(state.turn).toEqual({ number: 2, playerIndex: 1, placedAt: null })
    expect(state.phase).toEqual({ kind: 'placement' })
  })

  it('refuses a pass while a tile still fits', () => {
    expect(() => applyMove(newGame(), { kind: 'pass' })).toThrow(IllegalMoveError)
  })
})

describe('immigration within a turn', () => {
  const ready = withBag(withTiles(newGame(), { '8,3': station('blue'), '10,3': factory() }), { grey: 2 })

  it('waits for the active player to call each Station', () => {
    const state = applyMove(ready, { kind: 'place', tile: 'residence', at: '4,1' })
    expect(state.phase).toEqual({ kind: 'immigration', stationsToCall: ['8,3'], drawn: null })
  })

  it('ends the turn once the last family is housed', () => {
    const placed = applyMove(ready, { kind: 'place', tile: 'residence', at: '4,1' })
    const drawn = applyMove(placed, { kind: 'callStation', station: '8,3' })
    const housed = applyMove(drawn, { kind: 'settleFamily', residence: '9,2' })
    expect(housed.turn.playerIndex).toBe(1)
  })
})

describe('mergers', () => {
  // [6, 1] in C touches B's printed Residence across the rail.
  const beforeMerger = withTiles(newGame(), {
    '5,1': residence(null, ['vermillion']),
    '7,1': residence('blue'),
    '9,2': residence(null, ['blue']),
    '4,1': factory(),
    '10,5': factory(),
    '8,7': residence(null, ['grey', 'grey']),
  })
  const merged = applyMove(beforeMerger, { kind: 'place', tile: 'residence', at: '6,1' })

  it('joins the two cities', () => {
    expect(merged.cities).toEqual([['A'], ['B', 'C'], ['D'], ['E']])
  })

  it('puts a merger marker on the district line', () => {
    expect(merged.mergers).toEqual([{ number: 1, between: ['6,1', '5,1'] }])
  })

  it('pays tied leaders the city’s Factories', () => {
    expect(merged.players.map(player => player.score)).toEqual([1, 1])
  })

  it('pays nobody in a city grey leads', () => {
    const cityE = merged.elections[0].cities.find(city => city.districts.includes('E'))
    expect(cityE).toMatchObject({ factoryPoints: 2, scorers: [] })
  })

  it('merges every city a tile touches in one election', () => {
    const threeWay = withTiles(newGame(), { '5,2': residence('blue'), '5,4': residence('blue'), '6,3': residence('blue') })
    const state = applyMove(threeWay, { kind: 'place', tile: 'residence', at: '5,3' })
    expect(state.cities).toEqual([['A'], ['B', 'C', 'D'], ['E']])
    expect(state.mergers).toHaveLength(2)
    expect(state.elections).toHaveLength(1)
  })
})

describe('game end', () => {
  it('ends after the merger that leaves one city', () => {
    const nearlyDone: VotesState = { ...newGame(), cities: [['A', 'B', 'D', 'E'], ['C']] }
    const state = applyMove(withTiles(nearlyDone, { '7,1': residence('blue') }), {
      kind: 'place',
      tile: 'residence',
      at: '6,1',
    })
    expect(state.phase.kind).toBe('gameOver')
  })

  it('breaks a tied score on cubes on the board', () => {
    const tied = withTiles({ ...newGame(), cities: [['A', 'B', 'D', 'E'], ['C']] }, {
      '7,1': residence('blue'),
      '1,2': residence(null, ['blue']),
    })
    const state = applyMove(tied, { kind: 'place', tile: 'residence', at: '6,1' })
    expect(state.phase).toEqual({ kind: 'gameOver', winners: ['blue'] })
  })

  it('reports the winners and scores by seat', () => {
    const finished: VotesState = {
      ...newGame(3),
      phase: { kind: 'gameOver', winners: ['vermillion', 'yellow'] },
      players: newGame(3).players.map((player, seat) => ({ ...player, score: [7, 4, 7][seat] })),
    }
    expect(gameOutcome(finished)).toEqual({ winners: [0, 2], scores: [7, 4, 7] })
  })

  it('ends when a full round passes without anyone able to build', () => {
    // Every open hex is a Factory except [4, 1], which also touches a School.
    const filled: Record<string, Tile> = Object.fromEntries(
      BOARD.hexes.filter(hex => hex.terrain === 'open').map(hex => [hex.key, factory()]),
    )
    delete filled['4,1']
    const stuck = withTiles(newGame(), { ...filled, '5,1': school() })
    const noStock = { ...stuck, players: stuck.players.map(player => ({ ...player, residencesLeft: 0, stationsLeft: 0 })) }

    const state = applyMove(applyMove(noStock, { kind: 'pass' }), { kind: 'pass' })
    expect(state.phase.kind).toBe('gameOver')
  })
})
