import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { BOARD } from '../map/board'
import { applyMove, gameOutcome } from './turnFlow'
import { factory, newGame, residence, station, withTiles } from './testStates'
import type { Tile, VotesState } from './types'

describe('a quiet turn', () => {
  it('passes play to the next player when nothing needs a decision', () => {
    const state = applyMove(newGame(), { kind: 'place', tile: 'residence', at: '4,1' })
    expect(state.turn).toEqual({ number: 2, playerIndex: 1, placedAt: null })
    expect(state.phase).toEqual({ kind: 'placement' })
  })

  it('refuses a pass while a tile still fits', () => {
    expect(() => applyMove(newGame(), { kind: 'pass' })).toThrow(IllegalMoveError)
  })

  it('refuses a move from another phase', () => {
    expect(() => applyMove(newGame(), { kind: 'house', from: '0,4', color: 'grey', to: '1,2' })).toThrow(IllegalMoveError)
  })
})

describe('mergers', () => {
  // [6, 1] in C touches B's printed Residence across the rail. Pink's new Residence there
  // and vermillion's empty one at [7, 1] each hold their owner's seat.
  const beforeMerger = withTiles(newGame(), {
    '5,1': residence(null, ['pink', 'pink']),
    '7,1': residence('vermillion'),
    '9,2': residence(null, ['vermillion']),
    '4,1': factory(),
    '8,7': residence(null, ['pink', 'pink']),
    '8,6': factory(),
  })
  const merged = applyMove(beforeMerger, { kind: 'place', tile: 'residence', at: '6,1' })

  it('joins the two cities', () => {
    expect(merged.cities).toEqual([['A'], ['B', 'C'], ['D'], ['E']])
  })

  it('puts a merger marker on the district line', () => {
    expect(merged.mergers).toEqual([{ number: 1, between: ['6,1', '5,1'] }])
  })

  it('holds the election in the merged city only', () => {
    expect(merged.elections.map(election => election.city)).toEqual([['B', 'C']])
  })

  it('pays tied leaders the city’s Factories', () => {
    expect(merged.players.map(player => player.score)).toEqual([1, 1])
  })

  it('merges every city a tile touches in one election', () => {
    const threeWay = withTiles(newGame(), { '5,2': residence('vermillion'), '5,4': residence('vermillion'), '6,3': residence('vermillion') })
    const state = applyMove(threeWay, { kind: 'place', tile: 'residence', at: '5,3' })
    expect(state.cities).toEqual([['A'], ['B', 'C', 'D'], ['E']])
    expect(state.mergers).toHaveLength(2)
    expect(state.elections).toHaveLength(1)
  })
})

describe('game end', () => {
  const nearlyDone: VotesState = { ...newGame(), cities: [['A', 'B', 'D', 'E'], ['C']] }

  it('ends after the merger that leaves one city', () => {
    const state = applyMove(withTiles(nearlyDone, { '7,1': residence('vermillion') }), { kind: 'place', tile: 'residence', at: '6,1' })
    expect(state.phase.kind).toBe('gameOver')
  })

  it('breaks a tied score on cubes on the board, people waiting at Stations included', () => {
    // Grey wins the five printed Residences, so nobody scores. The four outside C are
    // full, so vermillion's cube keeps waiting at its Station in A.
    const fullOfGrey = residence(null, ['grey', 'grey', 'grey'])
    const tied = withTiles(nearlyDone, {
      '1,2': fullOfGrey,
      '5,1': fullOfGrey,
      '2,7': fullOfGrey,
      '8,7': fullOfGrey,
      '7,1': residence('vermillion'),
      '0,4': station('vermillion', ['vermillion']),
    })
    const state = applyMove(tied, { kind: 'place', tile: 'residence', at: '6,1' })
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
      BOARD.hexes.filter(hex => hex.terrain === 'open').map(hex => [hex.key, factory()]),
    )
    const state = applyMove(applyMove(withTiles(newGame(), filled), { kind: 'pass' }), { kind: 'pass' })
    expect(state.phase.kind).toBe('gameOver')
  })
})
