import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { TOWN_IDS } from '../map/board'
import { citiesOf, factoryCountIn, residencesInCity } from './boardQueries'
import { applyMove, drawsFromBag, gameOutcome } from './turnFlow'
import { chainBetween, chainWithGap, HOME, NEXT, soloNeighborOf, startOf, threeWayJoin, hexTouchingNothing, townSpots } from './testMap'
import { factory, joiningHex, newGame, residence, tilesOn, twoCities, withBag, withHand, withTiles } from './testStates'
import { FACTORY_DRAW, type CubeColor, type VotesState } from './types'

// Pink is the active player. Every starting Residence and printed Factory starts empty, and the bag too.

const arrivals = (state: VotesState) => state.log.filter(entry => entry.kind === 'arrived')
const cubesOn = (state: VotesState, at: string): CubeColor[] => {
  const tile = state.tiles[at]
  if (tile?.kind !== 'factory') throw new Error(`No Factory at ${at}`)
  return tile.cubes
}

describe('a turn', () => {
  const placed = applyMove(newGame(), { kind: 'place', tile: 'residence', at: soloNeighborOf(HOME) })

  it('starts with placing a tile, then the player pulls', () => {
    expect(placed.phase).toEqual({ kind: 'pulling' })
  })

  it('passes play on when the player ends it', () => {
    const ended = applyMove(placed, { kind: 'endTurn' })
    expect(ended.turn).toEqual({ number: 2, playerIndex: 1, placedAt: null })
    expect(ended.phase).toEqual({ kind: 'action' })
  })

  it('refuses a pass while a tile can be placed', () => {
    expect(() => applyMove(newGame(), { kind: 'pass' })).toThrow(IllegalMoveError)
  })

  it('refuses ending the turn before placing', () => {
    expect(() => applyMove(newGame(), { kind: 'endTurn' })).toThrow(IllegalMoveError)
  })

  it('moves nobody by itself, however crowded a city is', () => {
    const crowded = withTiles(newGame(), { [startOf(HOME)]: residence(['grey', 'grey', 'grey', 'grey']) })
    const state = applyMove(applyMove(crowded, { kind: 'place', tile: 'residence', at: soloNeighborOf(HOME) }), { kind: 'endTurn' })
    expect(state.tiles[startOf(HOME)]).toEqual(residence(['grey', 'grey', 'grey', 'grey']))
  })

  it('lets a player with no tile that fits pass, and still pull', () => {
    expect(applyMove(withHand(newGame(), {}), { kind: 'pass' }).phase).toEqual({ kind: 'pulling' })
  })
})

describe('a placed Factory', () => {
  const at = soloNeighborOf(HOME)
  const placeFactory = (bag: Partial<Record<CubeColor, number>>) => applyMove(withBag(newGame(), bag), { kind: 'place', tile: 'factory', at })

  it('draws 5 cubes from the bag onto itself', () => {
    expect(cubesOn(placeFactory({ blue: 4, grey: 4 }), at)).toHaveLength(FACTORY_DRAW)
  })

  it('draws only what the bag holds', () => {
    expect(cubesOn(placeFactory({ blue: 2 }), at)).toEqual(['blue', 'blue'])
  })

  it('belongs to its placer', () => {
    expect(placeFactory({}).tiles[at]).toEqual(factory([], 'pink'))
  })
})

describe('moves that draw from the bag', () => {
  const at = soloNeighborOf(HOME)

  it('include placing a Factory', () => {
    expect(drawsFromBag(withBag(newGame(), { pink: 5 }), { kind: 'place', tile: 'factory', at })).toBe(true)
  })

  it('leave out placing a Factory when the bag is empty', () => {
    expect(drawsFromBag(newGame(), { kind: 'place', tile: 'factory', at })).toBe(false)
  })

  it('leave out placing a Residence that joins no cities', () => {
    expect(drawsFromBag(withBag(newGame(), { pink: 5 }), { kind: 'place', tile: 'residence', at })).toBe(false)
  })

  it('leave out pulling people', () => {
    const [first] = townSpots(HOME)
    const state: VotesState = { ...withTiles(newGame(), { [first]: residence([], 'pink'), [startOf(HOME)]: residence(['grey', 'grey']) }), phase: { kind: 'pulling' } }
    expect(drawsFromBag(state, { kind: 'pull', from: startOf(HOME), color: 'grey', to: first, credit: null })).toBe(false)
  })

  it('refuse to judge a move that breaks the rules', () => {
    expect(() => drawsFromBag(newGame(), { kind: 'place', tile: 'residence', at: hexTouchingNothing() })).toThrow(IllegalMoveError)
  })
})

describe('mergers', () => {
  // A chain of empty Residences runs from NEXT's city towards HOME's, with a gap in the
  // middle that a Residence fills, joining them. HOME's starting Residence holds two pink
  // and NEXT's one vermillion. A Factory beside HOME, with any printed one, scores the seats.
  const chain = chainBetween(HOME, NEXT)
  const { filled, gap } = chainWithGap(chain)
  const factoryAt = townSpots(HOME).find(key => !chain.includes(key)) ?? ''
  const beforeMerger = (bag: Partial<Record<CubeColor, number>>) =>
    withBag(
      withTiles(newGame(), {
        ...tilesOn(filled, () => residence()),
        [factoryAt]: factory(),
        [startOf(HOME)]: residence(['pink', 'pink']),
        [startOf(NEXT)]: residence(['vermillion']),
      }),
      bag,
    )
  const merged = applyMove(beforeMerger({}), { kind: 'place', tile: 'residence', at: gap })
  const mergedCity = [HOME, NEXT].sort()

  it('joins the two cities', () => {
    expect(citiesOf(merged).filter(city => city.includes(HOME))).toEqual([mergedCity])
  })

  it('puts a merger marker on an edge of the new tile', () => {
    expect(merged.mergers).toHaveLength(1)
    expect(merged.mergers[0].between[0]).toBe(gap)
  })

  it('holds the election in the merged city only', () => {
    expect(merged.elections.map(election => election.city)).toEqual([mergedCity])
  })

  it('pays each player 1 point per Factory for every seat they hold', () => {
    const perSeat = factoryCountIn(merged, mergedCity)
    expect(merged.elections[0].pointsPerSeat).toBe(perSeat)
    expect(merged.players.map(player => player.score)).toEqual([perSeat, perSeat, 0])
  })

  it('then brings 1 person from the bag into each of the new city’s Residences', () => {
    const state = applyMove(beforeMerger({ blue: 20 }), { kind: 'place', tile: 'residence', at: gap })
    expect(arrivals(state)).toHaveLength(residencesInCity(state, mergedCity).length)
    expect(state.elections[0].seats.flatMap(seat => seat.people)).not.toContain('blue')
  })

  it('then has each player add 1 cube to the bag for every seat they won', () => {
    const state = applyMove(beforeMerger({ blue: 20 }), { kind: 'place', tile: 'residence', at: gap })
    expect(state.bag).toEqual({ blue: 20 - arrivals(state).length, pink: 1, vermillion: 1 })
  })

  it('adds the seats’ cubes only after the arrivals, so none of them arrives this turn', () => {
    expect(arrivals(merged)).toEqual([])
    expect(merged.bag).toEqual({ pink: 1, vermillion: 1 })
  })

  it('merges every city a tile touches in one election', () => {
    const { hex, arms, towns } = threeWayJoin()
    const threeWay = withTiles(newGame(), tilesOn(arms, () => residence()))
    const state = applyMove(threeWay, { kind: 'place', tile: 'residence', at: hex })
    expect(citiesOf(state).filter(city => towns.includes(city[0]))).toEqual([towns])
    expect(state.mergers).toHaveLength(2)
    expect(state.elections).toHaveLength(1)
  })
})

describe('game end', () => {
  const nearlyDone: VotesState = twoCities(newGame())
  const lastMerger = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'residence', at: joiningHex() })

  it('leaves two cities before the last tile', () => {
    expect(citiesOf(nearlyDone)).toHaveLength(2)
  })

  it('ends after the merger that leaves one city', () => {
    expect(lastMerger(nearlyDone).phase.kind).toBe('gameOver')
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
    const state = lastMerger(tied)
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

  it('ends once nobody can place and everyone has passed', () => {
    const stuck: VotesState = { ...newGame(), players: newGame().players.map(player => ({ ...player, supply: { residence: 0, factory: 0, school: 0 } })) }
    const passTurn = (state: VotesState) => applyMove(applyMove(state, { kind: 'pass' }), { kind: 'endTurn' })
    const afterTwo = passTurn(passTurn(stuck))
    expect(afterTwo.phase.kind).toBe('action')
    expect(passTurn(afterTwo).phase.kind).toBe('gameOver')
  })
})
