import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { TOWN_IDS } from '../map/board'
import { citiesOf } from './boardQueries'
import { applyMove, drawsFromBag, gameOutcome } from './turnFlow'
import { chainBetween, chainWithGap, HOME, NEXT, soloNeighborOf, soloNeighborsOf, startOf, threeWayJoin, hexTouchingNothing } from './testMap'
import {
  faceDownFactory,
  faceDownResidence,
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
  withTilesInHand,
} from './testStates'
import type { VotesState } from './types'

const NO_TILES = { residence: 0, factory: 0, school: 0 }

/** Nobody has a tile to take or place, and nothing is face down. */
function withNothingToDo(state: VotesState): VotesState {
  return { ...state, supply: NO_TILES, players: state.players.map(player => ({ ...player, supply: NO_TILES })) }
}

describe('a turn', () => {
  it('is one action, then play passes on', () => {
    const state = applyMove(newGame(), { kind: 'place', tile: 'residence', at: soloNeighborOf(HOME) })
    expect(state.turn).toEqual({ number: 2, playerIndex: 1, placedAt: null })
    expect(state.phase).toEqual({ kind: 'action' })
  })

  it('refuses a pass while there is an action to take', () => {
    expect(() => applyMove(newGame(), { kind: 'pass' })).toThrow(IllegalMoveError)
  })

  it('refuses a move from another phase', () => {
    expect(() => applyMove(newGame(), { kind: 'arrive', residence: startOf(HOME) })).toThrow(IllegalMoveError)
  })

  it('moves nobody after a face-down placement, however crowded the city', () => {
    const crowded = withTiles(newGame(), { [startOf(HOME)]: residence(['grey', 'grey', 'grey', 'grey']), [soloNeighborsOf(HOME)[1]]: residence() })
    const state = applyMove(crowded, { kind: 'place', tile: 'residence', at: soloNeighborOf(HOME) })
    expect(state.tiles[startOf(HOME)]).toEqual(residence(['grey', 'grey', 'grey', 'grey']))
  })
})

describe('moves that draw from the bag', () => {
  const [factoryAt, secondHome] = soloNeighborsOf(HOME)
  const flipFactory = { kind: 'flip' as const, at: factoryAt }
  const withFactory = (state: VotesState) => withTiles(state, { [factoryAt]: faceDownFactory() })

  it('include flipping a Factory', () => {
    expect(drawsFromBag(withBag(withFactory(newGame()), { pink: 5 }), flipFactory)).toBe(true)
  })

  it('leave out flipping a Factory when the bag is empty, since nobody arrives', () => {
    expect(drawsFromBag(withBag(withFactory(newGame()), {}), flipFactory)).toBe(false)
  })

  it('leave out placing a Factory face down', () => {
    expect(drawsFromBag(withBag(withTilesInHand(newGame(), { factory: 1 }), { pink: 5 }), { kind: 'place', tile: 'factory', at: factoryAt })).toBe(false)
  })

  it('include choosing where a drawn person goes when more are still to come', () => {
    // HOME's two Residences tie for the first person, and the other cities draw after.
    const tied = withBag(withTiles(withFactory(newGame()), { [secondHome]: residence() }), { pink: 6 })
    const choosing = applyMove(tied, flipFactory)
    expect(choosing.phase.kind).toBe('arrival')
    expect(drawsFromBag(choosing, { kind: 'arrive', residence: secondHome })).toBe(true)
  })

  it('leave out moving people about', () => {
    const crowded = withBag(withTiles(newGame(), { [startOf(HOME)]: residence(['grey', 'grey', 'grey']), [secondHome]: residence() }), { pink: 5 })
    const move = { kind: 'move' as const, from: startOf(HOME), color: 'grey' as const, to: secondHome }
    expect(drawsFromBag({ ...crowded, phase: { kind: 'movement' } }, move)).toBe(false)
  })

  it('refuse to judge a move that breaks the rules', () => {
    expect(() => drawsFromBag(newGame(), { kind: 'place', tile: 'residence', at: hexTouchingNothing() })).toThrow(IllegalMoveError)
  })
})

describe('mergers', () => {
  // A chain of tiles runs from NEXT's city towards HOME's, with a gap in the middle that a
  // face-down Residence fills, joining them. HOME's starting Residence holds two pink and
  // NEXT's one vermillion. The first tile of the chain is a face-up Factory, and the rest
  // Schools.
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

  it('joins the two cities, even with a face-down tile', () => {
    expect(merged.tiles[gap]).toEqual(faceDownResidence())
    expect(citiesOf(merged).filter(city => city.includes(HOME))).toEqual([[HOME, NEXT].sort()])
  })

  it('puts a merger marker on an edge of the new tile', () => {
    expect(merged.mergers).toHaveLength(1)
    expect(merged.mergers[0].between[0]).toBe(gap)
  })

  it('holds the election in the merged city only', () => {
    expect(merged.elections.map(election => election.city)).toEqual([[HOME, NEXT].sort()])
  })

  it('pays each player 1 point per face-up Factory for every seat they hold', () => {
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
})

describe('game end', () => {
  const nearlyDone: VotesState = withTilesInHand(twoCities(newGame()), { factory: 1 })
  const lastMerger = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', at: joiningHex() })

  it('leaves two cities before the last tile', () => {
    expect(citiesOf(nearlyDone)).toHaveLength(2)
  })

  it('ends after the merger that leaves one city', () => {
    expect(lastMerger(withBag(nearlyDone, {})).phase.kind).toBe('gameOver')
  })

  it('breaks a tied score on cubes on the board', () => {
    // Every town has 1 grey person, who doesn't vote. HOME holds an Orchid and a
    // vermillion, and the Orchid on the left wins the tie; NEXT holds a vermillion. Orchid
    // and vermillion hold a seat each and score the same, but vermillion has 2 cubes on
    // the board to Orchid's 1.
    const towns = Object.fromEntries(TOWN_IDS.map(town => [startOf(town), residence(['grey'])]))
    const tied = withTiles(nearlyDone, {
      ...towns,
      [startOf(HOME)]: residence(['pink', 'vermillion']),
      [startOf(NEXT)]: residence(['vermillion']),
    })
    const state = lastMerger(withBag(tied, {}))
    const [pink, vermillion] = state.players
    expect(pink.score).toBe(vermillion.score)
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

  it('ends when the board is one city and a player can only pass', () => {
    const full = withNothingToDo(filledColumns(newGame(), () => true))
    expect(applyMove(full, { kind: 'pass' }).phase.kind).toBe('gameOver')
  })

  it('ends once nobody can act and everyone has passed', () => {
    const stuck = withNothingToDo(newGame())
    const afterTwo = applyMove(applyMove(stuck, { kind: 'pass' }), { kind: 'pass' })
    expect(afterTwo.phase.kind).toBe('action')
    expect(applyMove(afterTwo, { kind: 'pass' }).phase.kind).toBe('gameOver')
  })
})
