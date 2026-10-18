import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { BOARD } from '../map/board'
import { applyMove, gameOutcome } from './turnFlow'
import { factory, newGame, residence, school, station, withTiles } from './testStates'
import type { Tile, VotesState } from './types'

describe('a quiet turn', () => {
  it('passes play to the next player when nothing needs a decision', () => {
    const state = applyMove(newGame(), { kind: 'place', tile: 'residence', color: 'sage', at: '4,1' })
    expect(state.turn).toEqual({ number: 2, playerIndex: 1, placedAt: null })
    expect(state.phase).toEqual({ kind: 'placement' })
  })

  it('refuses a pass while a tile still fits', () => {
    expect(() => applyMove(newGame(), { kind: 'pass' })).toThrow(IllegalMoveError)
  })

  it('refuses a move from another phase', () => {
    expect(() => applyMove(newGame(), { kind: 'house', from: '1,3', color: 'grey', to: '1,2' })).toThrow(IllegalMoveError)
  })
})

describe('mergers', () => {
  // A slate Residence at [6, 1] joins C, which reaches it through Schools at [8, 3], [7, 2]
  // and [7, 1], and touches B's sage starting Residence across the rail. The new city's
  // seats: pink (B's Residence), vermillion (C's) and grey (the new, empty one).
  const beforeMerger = withTiles(newGame(), {
    '5,1': residence('B', ['pink', 'pink']),
    '9,2': residence('C', ['vermillion']),
    '8,3': school('C'),
    '7,2': school('C'),
    '7,1': school('C'),
    '4,1': factory('B'),
    '8,7': residence('E', ['pink', 'pink']),
    '8,6': factory('E'),
  })
  const merged = applyMove(beforeMerger, { kind: 'place', tile: 'residence', color: 'slate', at: '6,1' })

  it('joins the two cities', () => {
    expect(merged.cities).toEqual([['A'], ['B', 'C'], ['D'], ['E']])
  })

  it('puts a merger marker on the edge between them', () => {
    expect(merged.mergers).toEqual([{ number: 1, between: ['6,1', '5,1'] }])
  })

  it('holds the election in the merged city only', () => {
    expect(merged.elections.map(election => election.city)).toEqual([['B', 'C']])
  })

  it('pays tied leaders the city’s Factories', () => {
    expect(merged.players.map(player => player.score)).toEqual([1, 1])
  })

  it('merges every city a tile touches in one election', () => {
    // A sage tile at [5, 3] joins B and touches D's and C's tiles.
    const threeWay = withTiles(newGame(), { '5,2': residence('B'), '5,4': residence('D'), '6,3': residence('C') })
    const state = applyMove(threeWay, { kind: 'place', tile: 'residence', color: 'sage', at: '5,3' })
    expect(state.cities).toEqual([['A'], ['B', 'C', 'D'], ['E']])
    expect(state.mergers).toHaveLength(2)
    expect(state.elections).toHaveLength(1)
  })
})

describe('game end', () => {
  const nearlyDone: VotesState = { ...newGame(), cities: [['A', 'B', 'D', 'E'], ['C']] }
  const lastMerger = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'residence', color: 'slate', at: '6,1' })

  it('ends after the merger that leaves one city', () => {
    expect(lastMerger(withTiles(nearlyDone, { '7,1': residence('C') })).phase.kind).toBe('gameOver')
  })

  it('breaks a tied score on cubes on the board, people waiting at Stations included', () => {
    // Grey wins every seat, so nobody scores. Every Residence but C's new ones is full,
    // so vermillion's cube keeps waiting at A's Station.
    const fullOfGrey = (town: 'A' | 'B' | 'C' | 'D' | 'E') => residence(town, ['grey', 'grey', 'grey'])
    const tied = withTiles(nearlyDone, {
      '1,2': fullOfGrey('A'),
      '5,1': fullOfGrey('B'),
      '9,2': fullOfGrey('C'),
      '1,7': fullOfGrey('D'),
      '8,7': fullOfGrey('E'),
      '7,1': fullOfGrey('C'),
      '1,3': station('A', ['vermillion']),
    })
    const state = lastMerger(tied)
    expect(state.tiles['1,3']).toEqual(station('A', ['vermillion']))
    expect(state.phase).toEqual({ kind: 'gameOver', winners: ['vermillion'] })
  })

  it('reports the winners and scores by seat', () => {
    const finished: VotesState = {
      ...newGame(3),
      phase: { kind: 'gameOver', winners: ['pink', 'blue'] },
      players: newGame(3).players.map((player, seat) => ({ ...player, score: [7, 4, 7][seat] })),
    }
    expect(gameOutcome(finished)).toEqual({ winners: [0, 2], scores: [7, 4, 7] })
  })

  it('ends when a full round passes without anyone able to build', () => {
    const filled: Record<string, Tile> = Object.fromEntries(
      BOARD.hexes.filter(hex => hex.terrain === 'open' && !newGame().tiles[hex.key]).map(hex => [hex.key, factory('A')]),
    )
    const state = applyMove(applyMove(withTiles(newGame(), filled), { kind: 'pass' }), { kind: 'pass' })
    expect(state.phase.kind).toBe('gameOver')
  })
})
