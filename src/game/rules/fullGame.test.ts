import { describe, expect, it } from 'vitest'
import { nextIndex } from 'game-kit/turns'
import { BOARD, hexAt } from '../map/board'
import { peopleOnBoard, residences, tilesInBoardOrder } from './boardQueries'
import { beginHousing, housingMoves } from './housing'
import { citiesJoinedBy } from './mergers'
import { townJoinedAt } from './placement'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { legalMoves } from './testStates'
import { applyMove } from './turnFlow'
import { RESIDENCE_CAPACITY, type VotesMove, type VotesState } from './types'

// Whole games played by seeded random agents, checking the rules' invariants after
// every move. A cautious agent avoids merging while it can, which drives games long
// enough to fill the board.

type Agent = 'random' | 'cautious'

const MOVE_LIMIT = 5000

function agentMoves(state: VotesState, agent: Agent): VotesMove[] {
  const moves = legalMoves(state)
  if (agent === 'random' || state.phase.kind !== 'placement') return moves
  const quiet = moves.filter(move => {
    if (move.kind !== 'place') return false
    const town = townJoinedAt(state, move.color, move.at)
    return town !== null && citiesJoinedBy(state, town, move.at).length === 0
  })
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
    // Stations stay where they're printed, and every tile wears its town's colour.
    expect(tile.kind === 'station').toBe(hexAt(key).stationSite !== null)
    expect(tile.color).toBe(state.townColors[tile.town])
    // Two towns of one colour never touch.
    for (const { key: neighborKey } of hexAt(key).neighbors) {
      const neighbor = state.tiles[neighborKey]
      if (neighbor?.color === tile.color) expect(neighbor.town).toBe(tile.town)
    }
  }
  // Cubes never leave the board.
  expect(peopleOnBoard(state).length).toBeGreaterThanOrEqual(peopleBefore)
  expect(Object.values(state.bag).every(count => (count ?? 0) >= 0)).toBe(true)
  for (const key of Object.keys(state.tiles)) expect(BOARD.hexByKey.get(key)?.terrain).toBe('open')
  // A new turn starts with everyone housed who could be, unless last turn's merger
  // (which comes after housing) gave them a bigger city to move into.
  const lastTurn = state.turn.number - 1
  const hadMerger = state.log.some(entry => entry.kind === 'merger' && entry.turn === lastTurn)
  if (state.phase.kind === 'placement' && !hadMerger) expect(housingMoves(beginHousing(state))).toEqual([])
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
    expect(final.cities).toHaveLength(1)
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
})

describe('determinism', () => {
  it('replays the same moves to the same state', () => {
    const { final, moves } = playOut(4, 11, 'random')
    const replayed = moves.reduce(applyMove, createInitialState({ settings: DEFAULT_SETTINGS, playerCount: 4, seed: 11 }))
    expect(replayed).toEqual(final)
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
