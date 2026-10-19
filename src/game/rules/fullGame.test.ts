import { describe, expect, it } from 'vitest'
import { nextIndex } from 'game-kit/turns'
import { BOARD, hexAt } from '../map/board'
import { bagSize, citiesOf, peopleOnBoard, residences, tilesInBoardOrder } from './boardQueries'
import { beginHousing, housingMoves } from './housing'
import { citiesTouchedBy } from './mergers'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { legalMoves } from './testStates'
import { applyMove } from './turnFlow'
import { RESIDENCE_CAPACITY, type VotesMove, type VotesState } from './types'

// Whole games played by seeded random agents, checking the rules' invariants after
// every move. A cautious agent avoids merging while it can, which drives games long
// enough to fill much of the board.

type Agent = 'random' | 'cautious'

const MOVE_LIMIT = 5000

function agentMoves(state: VotesState, agent: Agent): VotesMove[] {
  const moves = legalMoves(state)
  if (agent === 'random' || state.phase.kind !== 'placement') return moves
  const quiet = moves.filter(move => move.kind === 'place' && citiesTouchedBy(state, move.at).joins.length === 0)
  return quiet.length ? quiet : moves
}

const isNextToSchool = (state: VotesState, key: string) =>
  BOARD.hexByKey.get(key)?.neighbors.some(neighbor => state.tiles[neighbor.key]?.kind === 'school') ?? false

function expectInvariants(state: VotesState, peopleBefore: number): void {
  for (const { key, tile } of residences(state)) {
    // Only a School pushes people into a full Residence.
    if (tile.people.length > RESIDENCE_CAPACITY) expect(isNextToSchool(state, key)).toBe(true)
  }
  for (const { key, tile } of tilesInBoardOrder(state)) {
    // Stations stay where they're printed, and nothing else goes there.
    expect(tile.kind === 'station').toBe(hexAt(key).stationSite !== null)
  }
  // Cubes never leave the board, and every tile belongs to a city.
  expect(peopleOnBoard(state).length).toBeGreaterThanOrEqual(peopleBefore)
  expect(citiesOf(state).flat().sort()).toEqual(['A', 'B', 'C', 'D', 'E'])
  expect(Object.values(state.bag).every(count => (count ?? 0) >= 0)).toBe(true)
  for (const key of Object.keys(state.tiles)) expect(BOARD.hexByKey.get(key)?.terrain).toBe('open')
  // A new turn starts with everyone housed who could be.
  if (state.phase.kind === 'placement') expect(housingMoves(beginHousing(state))).toEqual([])
}

function playOut(playerCount: number, seed: number, agent: Agent): { final: VotesState; moves: VotesMove[] } {
  let state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  let agentRandom = seed
  const moves: VotesMove[] = []
  while (state.phase.kind !== 'gameOver' && moves.length < MOVE_LIMIT) {
    const options = agentMoves(state, agent)
    const { index, nextState } = nextIndex(agentRandom, options.length)
    agentRandom = nextState
    const peopleBefore = peopleOnBoard(state).length
    state = applyMove(state, options[index])
    moves.push(options[index])
    expectInvariants(state, peopleBefore)
  }
  return { final: state, moves }
}

describe.each([2, 3, 4, 5])('%i-player games', playerCount => {
  it.each([1, 2, 3, 4, 5])('random agents finish game %i', seed => {
    const { final } = playOut(playerCount, seed, 'random')
    expect(final.phase.kind).toBe('gameOver')
    expect(citiesOf(final)).toHaveLength(1)
  })

  it.each([1, 2, 3])('cautious agents finish game %i', seed => {
    expect(playOut(playerCount, seed, 'cautious').final.phase.kind).toBe('gameOver')
  })
})

describe('seeded games', () => {
  // So the invariants above are checked through every kind of decision.
  const movesPlayed = [2, 3, 4, 5].flatMap(playerCount => playOut(playerCount, 1, 'cautious').moves)

  it('relocate people for Schools', () => {
    expect(movesPlayed.some(move => move.kind === 'relocate')).toBe(true)
  })

  it('let the player choose where people are housed', () => {
    expect(movesPlayed.some(move => move.kind === 'house')).toBe(true)
  })

  it('let the player choose a Station for a Factory’s people', () => {
    expect(movesPlayed.some(move => move.kind === 'arrive')).toBe(true)
  })
})

describe('determinism', () => {
  it('replays the same moves to the same state', () => {
    const { final, moves } = playOut(4, 11, 'random')
    const replayed = moves.reduce(applyMove, createInitialState({ settings: DEFAULT_SETTINGS, playerCount: 4, seed: 11 }))
    expect(replayed).toEqual(final)
  })

  it('never overdraws the bag', () => {
    const { final } = playOut(2, 3, 'cautious')
    expect(bagSize(final)).toBeGreaterThanOrEqual(0)
  })

  it('survives a JSON round trip between moves', () => {
    const { final, moves } = playOut(3, 5, 'random')
    const viaJson = moves.reduce(
      (state, move) => JSON.parse(JSON.stringify(applyMove(state, move))) as VotesState,
      createInitialState({ settings: DEFAULT_SETTINGS, playerCount: 3, seed: 5 }),
    )
    expect(viaJson).toEqual(final)
  })
})
