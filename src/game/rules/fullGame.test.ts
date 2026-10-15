import { describe, expect, it } from 'vitest'
import { nextIndex } from 'game-kit/turns'
import { BOARD } from '../map/board'
import { bagSize, familiesOnBoard, factoryKeys, residences } from './boardQueries'
import { callableStations, homesForDrawnFamily } from './immigration'
import { citiesJoinedBy } from './mergers'
import { legalPlacements, TILE_KINDS } from './placement'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { applyMove } from './turnFlow'
import { HOMES_PER_RESIDENCE, JOBS_PER_FACTORY, type VotesMove, type VotesState } from './types'

// Whole games played by seeded random agents, checking the rules' invariants after
// every move. A cautious agent avoids merging while it can, which drives games long
// enough to empty stocks and fill the board.

type Agent = 'random' | 'cautious'

const MOVE_LIMIT = 5000

function placementMoves(state: VotesState): VotesMove[] {
  return TILE_KINDS.flatMap(tile => legalPlacements(state, tile).map(at => ({ kind: 'place' as const, tile, at })))
}

function legalMoves(state: VotesState, agent: Agent): VotesMove[] {
  const { phase } = state
  if (phase.kind === 'immigration') {
    return phase.drawn
      ? homesForDrawnFamily(state).map(residence => ({ kind: 'settleFamily' as const, residence }))
      : callableStations(state).map(station => ({ kind: 'callStation' as const, station }))
  }
  const placements = placementMoves(state)
  if (placements.length === 0) return [{ kind: 'pass' }]
  if (agent === 'random') return placements
  const quiet = placements.filter(move => move.kind === 'place' && citiesJoinedBy(state, move.at).length === 0)
  return quiet.length ? quiet : placements
}

function expectInvariants(state: VotesState): void {
  for (const { tile } of residences(state)) expect(tile.families.length).toBeLessThanOrEqual(HOMES_PER_RESIDENCE)
  expect(familiesOnBoard(state).length).toBeLessThanOrEqual(factoryKeys(state).length * JOBS_PER_FACTORY)
  expect(Object.values(state.bag).every(count => (count ?? 0) >= 0)).toBe(true)
  for (const key of Object.keys(state.tiles)) expect(BOARD.hexByKey.get(key)?.terrain).toBe('open')
  for (const player of state.players) {
    expect(player.residencesLeft).toBeGreaterThanOrEqual(0)
    expect(player.stationsLeft).toBeGreaterThanOrEqual(0)
  }
}

function playOut(playerCount: number, seed: number, agent: Agent): { final: VotesState; moves: VotesMove[] } {
  let state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  let agentRandom = seed
  const moves: VotesMove[] = []
  while (state.phase.kind !== 'gameOver' && moves.length < MOVE_LIMIT) {
    const options = legalMoves(state, agent)
    const { index, nextState } = nextIndex(agentRandom, options.length)
    agentRandom = nextState
    state = applyMove(state, options[index])
    moves.push(options[index])
    expectInvariants(state)
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

describe('determinism', () => {
  it('replays the same moves to the same state', () => {
    const { final, moves } = playOut(4, 11, 'random')
    const replayed = moves.reduce(
      applyMove,
      createInitialState({ settings: DEFAULT_SETTINGS, playerCount: 4, seed: 11 }),
    )
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

  it('never lets the bag run dry', () => {
    const { final } = playOut(2, 3, 'cautious')
    expect(bagSize(final)).toBeGreaterThan(0)
  })
})
