import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { citiesOf } from './boardQueries'
import { applyMove, drawsFromBag, gameOutcome } from './turnFlow'
import { chainBetween, chainWithGap, HOME, NEXT, soloNeighborOf, startOf, stationOf, threeWayJoin, hexTouchingNothing } from './testMap'
import {
  crowdedTowns,
  factory,
  filledColumns,
  joiningHex,
  newGame,
  residence,
  school,
  station,
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
    expect(() => applyMove(newGame(), { kind: 'house', from: stationOf(HOME), color: 'grey', to: startOf(HOME) })).toThrow(IllegalMoveError)
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

  it('leave out a Factory that is only waiting for the player to choose a Station', () => {
    // The Factory joins two towns, giving the city two Stations; the draw comes with the choice.
    const { filled, gap } = chainWithGap(chainBetween(HOME, NEXT))
    const joinable = withBag(withTiles(newGame(), tilesOn(filled, school)), { vermillion: 6 })
    const factoryMove = { kind: 'place' as const, tile: 'factory' as const, at: gap }
    expect(drawsFromBag(joinable, factoryMove)).toBe(false)
    const choosing = applyMove(joinable, factoryMove)
    expect(drawsFromBag(choosing, { kind: 'arrive', station: stationOf(NEXT) })).toBe(true)
  })

  it('leave out moving people about', () => {
    const housing = withBag(withTiles(newGame(), { [stationOf(HOME)]: station(['grey']), [soloNeighborOf(HOME)]: residence() }), { pink: 5 })
    const move = { kind: 'house' as const, from: stationOf(HOME), color: 'grey' as const, to: soloNeighborOf(HOME) }
    expect(drawsFromBag({ ...housing, phase: { kind: 'housing' } }, move)).toBe(false)
  })

  it('refuse to judge a move that breaks the rules', () => {
    expect(() => drawsFromBag(newGame(), { kind: 'place', tile: 'residence', at: hexTouchingNothing() })).toThrow(IllegalMoveError)
  })
})

describe('mergers', () => {
  // A chain of tiles runs from NEXT's city towards HOME's, with a gap in the middle that a
  // Residence fills, joining them. HOME's starting Residence holds two pink and NEXT's one
  // vermillion, so the new city has a seat each and an empty seat that belongs to nobody.
  // The first tile of the chain is a Factory, and the last a School.
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
    expect(merged.players.map(player => player.score)).toEqual([pointsPerSeat, pointsPerSeat, 0])
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

  it('houses people in the merged city the same turn', () => {
    // Someone waits at NEXT's Station, and the only room is the new Residence, which is in the
    // merged city. Every other starting Residence is full.
    const waiting = withTiles(beforeMerger, {
      ...crowdedTowns(),
      [stationOf(NEXT)]: station(['pink']),
    })
    const state = applyMove(waiting, { kind: 'place', tile: 'residence', at: gap })
    expect(state.tiles[gap]).toEqual(residence(['pink']))
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

  it('breaks a tied score on cubes on the board, people waiting at Stations included', () => {
    // Every starting Residence is full of grey, so grey takes every seat and nobody scores.
    // Vermillion's cube waiting at a Station is the only one on the board.
    const tied = withTiles(nearlyDone, { ...crowdedTowns(), [stationOf(HOME)]: station(['vermillion']) })
    const state = lastMerger(withBag(tied, {}))
    expect(state.tiles[stationOf(HOME)]).toEqual(station(['vermillion']))
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
