import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { TOWN_IDS } from '../map/board'
import { citiesOf } from './boardQueries'
import { applyMove, drawsFromBag, gameOutcome } from './turnFlow'
import { chainBetween, chainWithGap, HOME, NEXT, soloNeighborOf, soloNeighborsOf, startOf, threeWayJoin, hexTouchingNothing } from './testMap'
import {
  factory,
  filledColumns,
  joiningHex,
  newGame,
  residence,
  school,
  tilesOn,
  twoCities,
  withBag,
  withTiles,
} from './testStates'
import type { VotesState } from './types'

describe('a quiet turn', () => {
  it('passes play to the next player when nothing needs a decision', () => {
    const state = applyMove(newGame(), { kind: 'place', tile: 'residence', at: soloNeighborOf(HOME) })
    expect(state.turn).toEqual({ number: 2, playerIndex: 1, placedAt: null })
    expect(state.phase).toEqual({ kind: 'placement' })
  })

  it('refuses a pass while a tile still fits', () => {
    expect(() => applyMove(newGame(), { kind: 'pass' })).toThrow(IllegalMoveError)
  })

  it('refuses a move from another phase', () => {
    expect(() => applyMove(newGame(), { kind: 'arrive', residence: startOf(HOME) })).toThrow(IllegalMoveError)
  })
})

describe('moves that draw from the bag', () => {
  const place = (tile: 'factory' | 'residence') => ({ kind: 'place' as const, tile, at: soloNeighborOf(HOME) })

  it('include a Factory that brings people', () => {
    expect(drawsFromBag(withBag(newGame(), { pink: 5 }), place('factory'))).toBe(true)
  })

  it('leave out a Factory when the bag is empty, since nobody arrives', () => {
    expect(drawsFromBag(withBag(newGame(), {}), place('factory'))).toBe(false)
  })

  it('leave out tiles that bring nobody', () => {
    expect(drawsFromBag(withBag(newGame(), { pink: 5 }), place('residence'))).toBe(false)
  })

  it('include choosing where a drawn person goes when more are still to come', () => {
    // Two empty Residences tie for the first person, and two more are drawn after.
    const [factoryAt, secondHome] = soloNeighborsOf(HOME)
    const tied = withBag(withTiles(newGame(), { [secondHome]: residence() }), { pink: 6 })
    const choosing = applyMove(tied, { kind: 'place', tile: 'factory', at: factoryAt })
    expect(choosing.phase.kind).toBe('arrival')
    expect(drawsFromBag(choosing, { kind: 'arrive', residence: secondHome })).toBe(true)
  })

  it('leave out moving people about', () => {
    const crowded = withBag(withTiles(newGame(), { [startOf(HOME)]: residence(['grey', 'grey', 'grey']), [soloNeighborOf(HOME)]: residence() }), { pink: 5 })
    const move = { kind: 'move' as const, from: startOf(HOME), color: 'grey' as const, to: soloNeighborOf(HOME) }
    expect(drawsFromBag({ ...crowded, phase: { kind: 'movement' } }, move)).toBe(false)
  })

  it('refuse to judge a move that breaks the rules', () => {
    expect(() => drawsFromBag(newGame(), { kind: 'place', tile: 'residence', at: hexTouchingNothing() })).toThrow(IllegalMoveError)
  })
})

describe('mergers', () => {
  // A chain of tiles runs from NEXT's city towards HOME's, with a gap in the middle that a
  // Residence fills, joining them. HOME's starting Residence holds two pink and NEXT's one
  // vermillion; one pink levels into the new Residence, so pink holds 2 seats and
  // vermillion 1. The first tile of the chain is a Factory, and the rest Schools.
  const chain = chainBetween(HOME, NEXT)
  const { filled, gap } = chainWithGap(chain)
  const [firstOfHome] = chain
  const beforeMerger = withTiles(newGame(), {
    ...tilesOn(filled, school),
    [firstOfHome]: factory(),
    [startOf(HOME)]: residence(['pink', 'pink']),
    [startOf(NEXT)]: residence(['vermillion']),
  })
  const merged = applyMove(beforeMerger, { kind: 'place', tile: 'residence', at: gap })

  it('joins the two cities', () => {
    expect(citiesOf(merged).filter(city => city.includes(HOME))).toEqual([[HOME, NEXT].sort()])
  })

  it('puts a merger marker on an edge of the new tile', () => {
    expect(merged.mergers).toHaveLength(1)
    expect(merged.mergers[0].between[0]).toBe(gap)
  })

  it('holds the election in the merged city only', () => {
    expect(merged.elections.map(election => election.city)).toEqual([[HOME, NEXT].sort()])
  })

  it('pays each player for every seat they hold', () => {
    const [{ pointsPerSeat }] = merged.elections
    expect(pointsPerSeat).toBeGreaterThan(0)
    expect(merged.players.map(player => player.score)).toEqual([2 * pointsPerSeat, pointsPerSeat, 0])
  })

  it('merges every city a tile touches in one election', () => {
    const { hex, arms, towns } = threeWayJoin()
    const threeWay = withTiles(newGame(), tilesOn(arms, school))
    const state = applyMove(threeWay, { kind: 'place', tile: 'residence', at: hex })
    expect(citiesOf(state).filter(city => towns.includes(city[0]))).toEqual([towns])
    expect(state.mergers).toHaveLength(2)
    expect(state.elections).toHaveLength(1)
  })

  it('does not merge anything for a tile that touches one city', () => {
    const state = applyMove(newGame(), { kind: 'place', tile: 'residence', at: soloNeighborOf(HOME) })
    expect(state.mergers).toEqual([])
    expect(state.elections).toEqual([])
  })

  it('levels people across the merged city the same turn', () => {
    // NEXT's Residence is crowded and the new Residence joining it to HOME is empty; the
    // other towns' Residences are empty too, so the city's Schools pull nobody.
    const crowded = withTiles(withBag(beforeMerger, {}), {
      [startOf(HOME)]: residence(['pink', 'pink']),
      [startOf(NEXT)]: residence(['vermillion', 'vermillion', 'vermillion']),
    })
    const state = applyMove(crowded, { kind: 'place', tile: 'residence', at: gap })
    expect(state.tiles[gap]?.kind === 'residence' && state.tiles[gap].people.length).toBeGreaterThan(0)
  })
})

describe('game end', () => {
  const nearlyDone: VotesState = twoCities(newGame())
  const lastMerger = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', at: joiningHex() })

  it('leaves two cities before the last tile', () => {
    expect(citiesOf(nearlyDone)).toHaveLength(2)
  })

  it('ends after the merger that leaves one city', () => {
    expect(lastMerger(withBag(nearlyDone, {})).phase.kind).toBe('gameOver')
  })

  it('breaks a tied score on cubes on the board', () => {
    // Every town has 1 grey person, and HOME a vermillion beside its grey, so nobody can
    // level. Grey takes every seat, the tied one included, and nobody scores; vermillion's
    // is the only player cube on the board.
    const towns = Object.fromEntries(TOWN_IDS.map(town => [startOf(town), residence(['grey'])]))
    const tied = withTiles(nearlyDone, { ...towns, [startOf(HOME)]: residence(['grey', 'vermillion']) })
    const state = lastMerger(withBag(tied, {}))
    expect(state.players.every(player => player.score === 0)).toBe(true)
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
    const full = { ...filledColumns(newGame(), () => true), supply: { ...newGame().supply, mine: 0 } }
    expect(applyMove(full, { kind: 'pass' }).phase.kind).toBe('gameOver')
  })

  it('ends once the tiles have run out and everyone has passed', () => {
    const empty = { residence: 0, factory: 0, mine: 0, school: 0 }
    const outOfTiles: VotesState = { ...newGame(), supply: empty }
    const afterTwo = applyMove(applyMove(outOfTiles, { kind: 'pass' }), { kind: 'pass' })
    expect(afterTwo.phase.kind).toBe('placement')
    expect(applyMove(afterTwo, { kind: 'pass' }).phase.kind).toBe('gameOver')
  })
})
