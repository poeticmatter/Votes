import { nextIndex } from 'game-kit/turns'
import { activePlayerState, bagSize } from './boardQueries'
import { INDEPENDENT, PLAYER_COLORS, type CubeColor, type VotesState } from './types'

/** Fixed colour order, so a draw maps the random index to the same cube everywhere. */
const BAG_ORDER: readonly CubeColor[] = [INDEPENDENT, ...PLAYER_COLORS]

export function addToBag(state: VotesState, color: CubeColor, count: number): VotesState {
  if (count === 0) return state
  return { ...state, bag: { ...state.bag, [color]: (state.bag[color] ?? 0) + count } }
}

/** Votes: the active player adds `count` of their own cubes to the bag. */
export function addVotes(state: VotesState, count: number): VotesState {
  return addToBag(state, activePlayerState(state).color, count)
}

/** Draws one cube at random. The caller must check the bag isn't empty. */
export function drawFromBag(state: VotesState): { state: VotesState; color: CubeColor } {
  const total = bagSize(state)
  if (total === 0) throw new Error('Drew from an empty bag')

  const { index, nextState } = nextIndex(state.randomState, total)
  let remaining = index
  const color = BAG_ORDER.find(candidate => {
    const count = state.bag[candidate] ?? 0
    if (remaining < count) return true
    remaining -= count
    return false
  })
  // Unreachable: index < total, and total is the sum over BAG_ORDER.
  if (!color) throw new Error(`Bag draw ${index} of ${total} matched no colour`)

  return {
    state: { ...state, randomState: nextState, bag: { ...state.bag, [color]: (state.bag[color] ?? 0) - 1 } },
    color,
  }
}
