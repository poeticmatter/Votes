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
  const ready = withBag(withTiles(newGame(), { '8,3': station('vermillion'), '10,3': factory() }), { grey: 2 })

  const placed = applyMove(ready, { kind: 'place', tile: 'residence', at: '4,1' })
  const houseOneFamily = (state: VotesState) =>
    applyMove(applyMove(state, { kind: 'callStation', station: '8,3' }), { kind: 'settleFamily', residence: '9,2' })

  it('waits for the active player to call a Station', () => {
    expect(placed.phase).toEqual({ kind: 'immigration', districtsEntered: [], drawn: null })
  })

  it('keeps bringing families while there are homes and jobs', () => {
    expect(houseOneFamily(placed).turn.playerIndex).toBe(0)
  })

  it('ends the turn once no Station can bring anyone', () => {
    // The first family pays vermillion's single cube back; the second pays nothing, emptying the bag.
    const drained = houseOneFamily(houseOneFamily(withBag(placed, { grey: 1 })))
    expect(drained.turn.playerIndex).toBe(1)
  })
})

describe('mergers', () => {
  // [6, 1] in C touches B's printed Residence across the rail.
  const beforeMerger = withTiles(newGame(), {
    '5,1': residence(null, ['pink']),
    '7,1': residence('vermillion'),
    '9,2': residence(null, ['vermillion']),
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
    const threeWay = withTiles(newGame(), { '5,2': residence('vermillion'), '5,4': residence('vermillion'), '6,3': residence('vermillion') })
    const state = applyMove(threeWay, { kind: 'place', tile: 'residence', at: '5,3' })
    expect(state.cities).toEqual([['A'], ['B', 'C', 'D'], ['E']])
    expect(state.mergers).toHaveLength(2)
    expect(state.elections).toHaveLength(1)
  })
})

describe('game end', () => {
  it('ends after the merger that leaves one city', () => {
    const nearlyDone: VotesState = { ...newGame(), cities: [['A', 'B', 'D', 'E'], ['C']] }
    const state = applyMove(withTiles(nearlyDone, { '7,1': residence('vermillion') }), {
      kind: 'place',
      tile: 'residence',
      at: '6,1',
    })
    expect(state.phase.kind).toBe('gameOver')
  })

  it('breaks a tied score on cubes on the board', () => {
    const tied = withTiles({ ...newGame(), cities: [['A', 'B', 'D', 'E'], ['C']] }, {
      '7,1': residence('vermillion'),
      '1,2': residence(null, ['vermillion']),
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
