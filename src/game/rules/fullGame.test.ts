import { describe, expect, it } from 'vitest'
import { nextIndex } from 'game-kit/turns'
import { BOARD } from '../map/board'
import { bagSize, citiesOf, peopleOnBoard } from './boardQueries'
import { citiesTouchedBy } from './mergers'
import { createInitialState, DEFAULT_SETTINGS } from './setup'
import { legalMoves } from './testStates'
import { applyMove } from './turnFlow'
import type { VotesMove, VotesState } from './types'

// Whole games played by seeded random agents, checking the rules' invariants after
// every move. A cautious agent avoids placing tiles that merge cities while it can, which
// drives games on until the tiles run out.

type Agent = 'random' | 'cautious'

const MOVE_LIMIT = 5000

function agentMoves(state: VotesState, agent: Agent): VotesMove[] {
  const moves = legalMoves(state)
  if (agent === 'random' || state.phase.kind !== 'action') return moves
  const quiet = moves.filter(move => move.kind !== 'place' || citiesTouchedBy(state, move.at).joins.length === 0)
  return quiet.length ? quiet : moves
}

function expectInvariants(state: VotesState, peopleBefore: number): void {
  // Every starting Residence stays where it's printed.
  for (const hex of BOARD.hexes.filter(candidate => candidate.residenceSite)) expect(state.tiles[hex.key]?.kind).toBe('residence')
  // Cubes never leave the board, and every tile belongs to a city.
  expect(peopleOnBoard(state).length).toBeGreaterThanOrEqual(peopleBefore)
  expect(citiesOf(state).flat().sort()).toEqual(['A', 'B', 'C', 'D', 'E'])
  expect(Object.values(state.bag).every(count => (count ?? 0) >= 0)).toBe(true)
  // Tiles sit only on open hexes, and face-down Residences hold nobody.
  for (const [key, tile] of Object.entries(state.tiles)) {
    expect(BOARD.hexByKey.get(key)?.terrain).toBe('open')
    if (tile.kind === 'residence' && tile.isFaceDown) expect(tile.people).toEqual([])
  }
  // Tiles are never made or lost: the shared supply, players' supplies and the board add up.
  expect(Object.values(state.supply).every(count => count >= 0)).toBe(true)
  for (const player of state.players) expect(Object.values(player.supply).every(count => count >= 0)).toBe(true)
  expect(tileTotal(state)).toBe(TILES_IN_GAME)
}

/** Every tile in the shared supply, in players' supplies and placed, the printed ones aside. */
function tileTotal(state: VotesState): number {
  const inSupplies = [state.supply, ...state.players.map(player => player.supply)].flatMap(Object.values)
  const placed = Object.keys(state.tiles).filter(key => !BOARD.hexByKey.get(key)?.residenceSite && !BOARD.hexByKey.get(key)?.hasStartingFactory)
  return inSupplies.reduce((sum, count) => sum + count, 0) + placed.length
}

const TILES_IN_GAME = Object.values(DEFAULT_SETTINGS.tileCounts).reduce((sum, count) => sum + count, 0)

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

/** How the game ended: the last merger, or everyone passing once nobody could act. */
const endReason = (state: VotesState) => state.log.find(entry => entry.kind === 'gameOver')

describe.each([3, 4, 5])('%i-player games', playerCount => {
  it.each([1, 2, 3, 4, 5])('random agents finish game %i', seed => {
    const { final } = playOut(playerCount, seed, 'random')
    expect(final.phase.kind).toBe('gameOver')
    expect(citiesOf(final).length === 1).toBe(endReason(final)?.reason === 'lastMerger')
  })

  it.each([1, 2, 3])('cautious agents finish game %i', seed => {
    expect(playOut(playerCount, seed, 'cautious').final.phase.kind).toBe('gameOver')
  })
})

describe('seeded games', () => {
  // So the invariants above are checked through every kind of decision.
  const games = [3, 4, 5].flatMap(playerCount => [playOut(playerCount, 1, 'cautious'), playOut(playerCount, 1, 'random')])
  const movesPlayed = games.flatMap(game => game.moves)

  const movesLogged = games.flatMap(({ final }) => final.log.filter(entry => entry.kind === 'moved'))

  it('level people within cities', () => {
    expect(movesLogged.some(entry => entry.reason === 'levelling')).toBe(true)
  })

  it('pull people into School cities', () => {
    expect(movesLogged.some(entry => entry.reason === 'schoolPull')).toBe(true)
  })

  it('let the player break ties when people move', () => {
    expect(movesPlayed.some(move => move.kind === 'move')).toBe(true)
  })

  it('let the player choose between tied Residences for a Factory’s people', () => {
    expect(movesPlayed.some(move => move.kind === 'arrive')).toBe(true)
  })

  it('take, place and flip tiles', () => {
    for (const kind of ['take', 'place', 'flip'] as const) expect(movesPlayed.some(move => move.kind === kind)).toBe(true)
  })

  it('flip Schools into Universities', () => {
    const flips = games.flatMap(({ final }) => final.log.filter(entry => entry.kind === 'flipped'))
    expect(flips.some(entry => entry.into === 'university')).toBe(true)
  })
})

describe('determinism', () => {
  it('replays the same moves to the same state', () => {
    const { final, moves } = playOut(4, 11, 'random')
    const replayed = moves.reduce(applyMove, createInitialState({ settings: DEFAULT_SETTINGS, playerCount: 4, seed: 11 }))
    expect(replayed).toEqual(final)
  })

  it('never overdraws the bag', () => {
    const { final } = playOut(3, 3, 'cautious')
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
