import { describe, expect, it } from 'vitest'
import { nextIndex } from 'game-kit/turns'
import { TOWN_IDS } from '../map/board'
import { legalMoves } from '../rules/legalMoves'
import { createInitialState, DEFAULT_SETTINGS } from '../rules/setup'
import { HOME, NEXT, hexTouchingOnly, startOf } from '../rules/testMap'
import { newGame, residence, twoCities, withTiles } from '../rules/testStates'
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
  const seeds = Array.from({ length: 10 }, (_, index) => index + 1)

  it('wins nearly every game', () => {
    const wins = seeds.filter(seed => {
      const final = playOut(4, seed, seat => (seat === 0 ? bot : randomPlayer))
      return final.phase.kind === 'gameOver' && final.phase.winners.includes('pink')
    })
    expect(wins.length).toBeGreaterThanOrEqual(8)
  })
})

describe('arrivals', () => {
  it('settles its own person where they take a seat', () => {
    const [rivals, independents] = [startOf(HOME), startOf(NEXT)]
    const tied = withTiles(newGame(), { [rivals]: residence(['vermillion']), [independents]: residence(['grey']) })
    const arriving: VotesState = { ...tied, phase: { kind: 'arrival', person: 'pink', residences: [rivals, independents], remainingCities: [] } }
    expect(chooseBotMove(arriving, 0)).toEqual({ kind: 'arrive', residence: independents })
  })
})

describe('movement', () => {
  it('moves its own person into an empty seat when that keeps the seat it leaves', () => {
    const crowded = startOf(HOME)
    const empty = hexTouchingOnly(crowded)
    const levelling: VotesState = {
      ...withTiles(newGame(), { [crowded]: residence(['pink', 'pink', 'pink', 'vermillion']), [empty]: residence() }),
      phase: { kind: 'movement' },
    }
    expect(chooseBotMove(levelling, 0)).toEqual({ kind: 'move', from: crowded, color: 'pink', to: empty })
  })
})

describe('the last merger', () => {
  /** Two cities left, with every town's seat held by `holder`. */
  const lastTwoCities = (holder: CubeColor): VotesState =>
    withTiles(twoCities(newGame()), Object.fromEntries(TOWN_IDS.map(town => [startOf(town), residence([holder])])))

  it('ends the game when the bot would win', () => {
    const final = applyMove(lastTwoCities('pink'), chooseBotMove(lastTwoCities('pink'), 0))
    expect(final.phase).toEqual({ kind: 'gameOver', winners: ['pink'] })
  })

  it('keeps the game going when a rival would win', () => {
    const after = applyMove(lastTwoCities('vermillion'), chooseBotMove(lastTwoCities('vermillion'), 0))
    expect(after.phase.kind).not.toBe('gameOver')
  })
})
