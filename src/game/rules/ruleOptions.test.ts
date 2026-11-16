import { describe, expect, it } from 'vitest'
import { TOWN_IDS } from '../map/board'
import { citiesOf, peopleOnBoard } from './boardQueries'
import { legalMoves } from './legalMoves'
import { legalPlacements } from './placement'
import { createInitialState, DEFAULT_SETTINGS, NO_TILES } from './setup'
import { FAR, HOME, soloNeighborOf, soloNeighborsOf, startOf } from './testMap'
import { newGame, residence, school, withBag, withTiles, withTilesInHand } from './testStates'
import { applyMove } from './turnFlow'
import type { RuleOptions, VotesState } from './types'

// The rules proposed after Draft 5.13, each switched on alone. Pink is the active player,
// and every starting Residence starts empty.

const withOptions = (state: VotesState, options: Partial<RuleOptions>): VotesState => ({ ...state, options: { ...state.options, ...options } })

const CUBES_PER_TILE = { residence: 1, factory: 2, school: 0, hub: 0, port: 3, hall: 0 }

describe('personal tiles', () => {
  const personalTiles = { ...NO_TILES, residence: 3, factory: 2, port: 1 }
  const state = createInitialState({ settings: { ...DEFAULT_SETTINGS, personalTiles }, playerCount: 4, seed: 3 })

  it('gives every player the same tiles of their own', () => {
    expect(state.players.map(player => player.supply)).toEqual(Array(4).fill(personalTiles))
  })

  it('leaves nothing to take', () => {
    expect(Object.values(state.supply).every(count => count === 0)).toBe(true)
  })
})

describe('cubes per tile', () => {
  const board = withOptions(withTilesInHand(newGame(), { factory: 1 }), { bagCubesOnPlace: CUBES_PER_TILE })
  const placed = applyMove(withBag(board, {}), { kind: 'place', tile: 'factory', at: soloNeighborOf(HOME) })

  it('adds the tile’s cubes of the placer’s colour to the bag', () => {
    expect(placed.bag).toEqual({ pink: 2 })
  })

  it('replaces the face-down Factory’s Residence tiles', () => {
    expect(placed.players[0].supply.residence).toBe(board.players[0].supply.residence)
  })
})

describe('a Port', () => {
  const board = withBag(withTilesInHand(newGame(), { port: 1 }), { grey: 10 })
  const placed = applyMove(board, { kind: 'place', tile: 'port', at: soloNeighborOf(HOME) })

  it('is placed face up', () => {
    expect(placed.tiles[soloNeighborOf(HOME)]).toEqual({ kind: 'port' })
  })

  it('draws a person from the bag for every city', () => {
    expect(peopleOnBoard(placed)).toHaveLength(citiesOf(board).length)
  })
})

describe('Hubs', () => {
  // HOME's Residence is crowded and FAR's empty; a Hub beside each lets people level between them.
  const crowded = withTiles(newGame(), {
    [startOf(HOME)]: residence(['grey', 'grey', 'grey', 'grey']),
    [soloNeighborOf(HOME)]: { kind: 'hub' },
  })
  const placeHubAtFar = (state: VotesState) => applyMove(withTilesInHand(state, { hub: 1 }), { kind: 'place', tile: 'hub', at: soloNeighborOf(FAR) })

  it('level people between cities that both have one', () => {
    expect(placeHubAtFar(crowded).tiles[startOf(FAR)]).toEqual(residence(['grey', 'grey']))
  })

  it('leave cities without one alone', () => {
    const otherTowns = TOWN_IDS.filter(town => town !== HOME && town !== FAR)
    const after = placeHubAtFar(crowded)
    for (const town of otherTowns) expect(after.tiles[startOf(town)]).toEqual(residence())
  })
})

describe('a Town Hall', () => {
  const board = withTilesInHand(withTiles(newGame(), { [startOf(HOME)]: residence(['pink']) }), { hall: 2 })
  const hallAt = soloNeighborOf(HOME)
  const placed = applyMove(board, { kind: 'place', tile: 'hall', at: hallAt })

  it('has its city vote without merging', () => {
    expect(placed.elections.map(election => election.city)).toEqual([[HOME]])
  })

  it('can’t go in a city that already has one', () => {
    const withHall = withTiles(board, { [hallAt]: { kind: 'hall' } })
    expect(legalPlacements(withHall, 'hall').filter(key => soloNeighborsOf(HOME).includes(key))).toEqual([])
  })
})

describe('place-only turns', () => {
  const board = withOptions(withTilesInHand(withBag(newGame(), { grey: 10 }), { factory: 1 }), { isPlaceOnly: true })
  const at = soloNeighborOf(HOME)

  it('put every tile down face up', () => {
    expect(applyMove(board, { kind: 'place', tile: 'residence', at }).tiles[at]).toEqual(residence())
  })

  it('offer nothing to take or flip', () => {
    const withFaceDown = withTiles(board, { [at]: { kind: 'factory', isFaceDown: true } })
    expect(legalMoves(withFaceDown).every(move => move.kind === 'place')).toBe(true)
  })

  it('let a Factory bring nobody', () => {
    expect(peopleOnBoard(applyMove(board, { kind: 'place', tile: 'factory', at }))).toEqual([])
  })

  it('let a Factory draw a person for every city when it brings people', () => {
    const drawing = withOptions(board, { factoryArrivals: 'everyCity' })
    expect(peopleOnBoard(applyMove(drawing, { kind: 'place', tile: 'factory', at }))).toHaveLength(citiesOf(board).length)
  })
})

describe('a Factory bringing people to its own city', () => {
  const [factoryAt, homeHub] = soloNeighborsOf(HOME)
  const [farHub, farSchool] = soloNeighborsOf(FAR)
  const board = withOptions(withTilesInHand(withBag(newGame(), { grey: 10 }), { factory: 1 }), { isPlaceOnly: true, factoryArrivals: 'ownCity' })
  const arrivalHomes = (state: VotesState) => state.log.flatMap(entry => (entry.kind === 'arrived' ? [entry.residence] : []))
  const placeFactory = (state: VotesState) => applyMove(state, { kind: 'place', tile: 'factory', at: factoryAt })

  it('brings 2 people into its own city, even when another city has a School', () => {
    const withSchoolElsewhere = withTiles(board, { [farSchool]: school() })
    expect(arrivalHomes(placeFactory(withSchoolElsewhere))).toEqual([startOf(HOME), startOf(HOME)])
  })

  it('sends them to a School city its Hub joins it to', () => {
    const joined = withTiles(board, { [homeHub]: { kind: 'hub' }, [farHub]: { kind: 'hub' }, [farSchool]: school() })
    expect(arrivalHomes(placeFactory(joined))).toEqual([startOf(FAR), startOf(FAR)])
  })
})

describe('closed hexes', () => {
  it('take no tile', () => {
    const closed = soloNeighborOf(HOME)
    expect(legalPlacements(withOptions(newGame(), { closedHexes: [closed] }), 'residence')).not.toContain(closed)
  })
})
