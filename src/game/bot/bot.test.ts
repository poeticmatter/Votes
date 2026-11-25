import { describe, expect, it } from 'vitest'
import { nextIndex } from 'game-kit/turns'
import { BOARD, TOWN_IDS } from '../map/board'
import { citiesOf } from '../rules/boardQueries'
import { citiesTouchedBy } from '../rules/mergers'
import { legalActions, legalMoves } from '../rules/legalMoves'
import { createInitialState, DEFAULT_SETTINGS } from '../rules/setup'
import { HOME, splitColumn, startOf, townSpots } from '../rules/testMap'
import { factory, newGame, pulling, residence, twoCities, withTiles } from '../rules/testStates'
import { applyMove } from '../rules/turnFlow'
import type { CubeColor, VotesMove, VotesState } from '../rules/types'
import { chooseBotMove } from '.'

// Seat 0 plays pink (Orchid) and seat 1 vermillion in every state built here.

const MOVE_LIMIT = 5000

type Player = (state: VotesState) => VotesMove

function playOut(playerCount: number, seed: number, playerFor: (seat: number) => Player): VotesState {
  let state = createInitialState({ settings: DEFAULT_SETTINGS, playerCount, seed })
  for (let moves = 0; state.phase.kind !== 'gameOver' && moves < MOVE_LIMIT; moves += 1) {
    state = applyMove(state, playerFor(state.turn.playerIndex)(state))
  }
  return state
}

const bot: Player = state => chooseBotMove(state, state.turn.playerIndex)

/** A player picking any legal move, seeded by the state so games replay the same. */
const randomPlayer: Player = state => {
  const options = legalMoves(state)
  return options[nextIndex(state.turn.number * 31 + state.log.length, options.length).index]
}

describe.each([3, 4, 5])('%i bots', playerCount => {
  it.each([1, 2, 3])('play game %i to the end', seed => {
    expect(playOut(playerCount, seed, () => bot).phase.kind).toBe('gameOver')
  })
})

describe('against random players', () => {
  const seeds = Array.from({ length: 20 }, (_, index) => index + 1)

  it('wins at least 3 games in 4', () => {
    const wins = seeds.filter(seed => {
      const final = playOut(4, seed, seat => (seat === 0 ? bot : randomPlayer))
      return final.phase.kind === 'gameOver' && final.phase.winners.includes('pink')
    })
    expect(wins.length).toBeGreaterThanOrEqual(15)
  })
})

describe('pulling', () => {
  const [own, other] = townSpots(HOME)

  it('pulls its own person into its own Residence to win the seat', () => {
    const state = pulling(withTiles(newGame(), { [own]: residence([], 'pink'), [other]: factory(['vermillion', 'pink'], 'vermillion') }))
    expect(chooseBotMove(state, 0)).toEqual({ kind: 'pull', from: other, color: 'pink', to: own, credit: null })
  })

  it('ends the turn when no pull gains it anything', () => {
    const state = pulling(withTiles(newGame(), { [own]: residence(['pink'], 'pink'), [other]: factory(['vermillion'], 'vermillion') }))
    expect(chooseBotMove(state, 0)).toEqual({ kind: 'endTurn' })
  })
})

describe('the last merger', () => {
  /**
   * Two cities left, with every town's seat held by `holder`, and one hex beside the split
   * left open, where a tile joins nothing.
   */
  const lastTwoCities = (holder: CubeColor): VotesState => {
    const board = withTiles(twoCities(newGame()), Object.fromEntries(TOWN_IDS.map(town => [startOf(town), residence([holder])])))
    const { column } = splitColumn()
    const opened = BOARD.hexes
      .filter(hex => Math.abs(hex.col - column) === 1 && board.tiles[hex.key]?.kind === 'factory' && !hex.hasStartingFactory)
      .map(hex => ({ ...board, tiles: Object.fromEntries(Object.entries(board.tiles).filter(([key]) => key !== hex.key)) }))
      .find(candidate => citiesOf(candidate).length === 2 && legalActions(candidate).some(move => move.kind === 'place' && citiesTouchedBy(candidate, move.at).joins.length === 0))
    if (!opened) throw new Error('No hex beside the split can be opened without joining or splitting cities')
    return opened
  }

  it('ends the game when the bot would win', () => {
    const final = applyMove(lastTwoCities('pink'), chooseBotMove(lastTwoCities('pink'), 0))
    expect(final.phase).toEqual({ kind: 'gameOver', winners: ['pink'] })
  })

  it('keeps the game going when a rival would win', () => {
    const after = applyMove(lastTwoCities('vermillion'), chooseBotMove(lastTwoCities('vermillion'), 0))
    expect(after.phase.kind).not.toBe('gameOver')
  })
})
