import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { citiesOf } from './boardQueries'
import { applyMove, gameOutcome } from './turnFlow'
import { factory, filledColumns, JOINING_HEX, newGame, residence, school, station, twoCities, withBag, withTiles } from './testStates'
import type { VotesState } from './types'

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
    expect(() => applyMove(newGame(), { kind: 'house', from: '1,3', color: 'grey', to: '1,2' })).toThrow(IllegalMoveError)
  })
})

describe('mergers', () => {
  // A tile at [8, 3] touches C's Station and a School at [7, 2], the end of an arm of
  // tiles from B. B's starting Residence has two pink people and C's one vermillion, so
  // the new city has a seat each and an empty seat that counts for nobody. B's Factory
  // at [6, 1] borders the rail.
  const beforeMerger = withTiles(newGame(), {
    '5,1': residence(['pink', 'pink']),
    '9,2': residence(['vermillion']),
    '6,1': factory(),
    '7,1': school(),
    '7,2': school(),
  })
  const merged = applyMove(beforeMerger, { kind: 'place', tile: 'residence', at: '8,3' })

  it('joins the two cities', () => {
    expect(citiesOf(merged)).toEqual([['A'], ['B', 'C'], ['D'], ['E']])
  })

  it('puts a merger marker on the edge between them', () => {
    expect(merged.mergers).toEqual([{ number: 1, between: ['8,3', '7,2'] }])
  })

  it('holds the election in the merged city only', () => {
    expect(merged.elections.map(election => election.city)).toEqual([['B', 'C']])
  })

  it('pays tied leaders the city’s Factories', () => {
    expect(merged.players.map(player => player.score)).toEqual([2, 2])
  })

  it('merges every city a tile touches in one election', () => {
    // [3, 3] touches arms from A at [2, 3], from B at [4, 3] and from D at [3, 4].
    const threeWay = withTiles(newGame(), {
      '2,3': residence(),
      '5,2': residence(),
      '4,3': residence(),
      '2,6': residence(),
      '3,5': residence(),
      '3,4': residence(),
    })
    const state = applyMove(threeWay, { kind: 'place', tile: 'residence', at: '3,3' })
    expect(citiesOf(state)).toEqual([['A', 'B', 'D'], ['C'], ['E']])
    expect(state.mergers).toHaveLength(2)
    expect(state.elections).toHaveLength(1)
  })

  it('does not merge anything for a tile that touches one city', () => {
    const state = applyMove(newGame(), { kind: 'place', tile: 'residence', at: '4,1' })
    expect(state.mergers).toEqual([])
    expect(state.elections).toEqual([])
  })

  it('houses people in the merged city the same turn', () => {
    // Someone waits at C's Station, and the only room is the new Residence, which is in the merged city.
    const waiting = withTiles(beforeMerger, {
      '9,3': station(['pink']),
      '9,2': residence(['vermillion', 'vermillion', 'vermillion']),
      '5,1': residence(['pink', 'pink', 'pink']),
      '8,7': residence(['pink', 'pink', 'pink']),
    })
    const state = applyMove(waiting, { kind: 'place', tile: 'residence', at: '8,3' })
    expect(state.tiles['8,3']).toEqual(residence(['pink']))
  })
})

describe('game end', () => {
  const nearlyDone: VotesState = twoCities(newGame())
  const lastMerger = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', at: JOINING_HEX })

  it('leaves two cities before the last tile', () => {
    expect(citiesOf(nearlyDone)).toEqual([['A', 'D'], ['B', 'C', 'E']])
  })

  it('ends after the merger that leaves one city', () => {
    expect(lastMerger(withBag(nearlyDone, {})).phase.kind).toBe('gameOver')
  })

  it('breaks a tied score on cubes on the board, people waiting at Stations included', () => {
    // Every starting Residence is full of grey, so grey takes every seat and nobody scores.
    // Vermillion's cube waiting at A's Station is the only one on the board.
    const fullOfGrey = residence(['grey', 'grey', 'grey'])
    const tied = withTiles(nearlyDone, {
      '1,2': fullOfGrey,
      '5,1': fullOfGrey,
      '9,2': fullOfGrey,
      '1,7': fullOfGrey,
      '8,7': fullOfGrey,
      '1,3': station(['vermillion']),
    })
    const state = lastMerger(withBag(tied, {}))
    expect(state.tiles['1,3']).toEqual(station(['vermillion']))
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

  it('ends when the board is full and a player can only pass', () => {
    const full = filledColumns(newGame(), () => true)
    expect(applyMove(full, { kind: 'pass' }).phase.kind).toBe('gameOver')
  })
})
