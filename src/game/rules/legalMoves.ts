import { legalPlacements, PLACEABLE_KINDS } from './placement'
import { legalPulls } from './pulls'
import type { VotesMove, VotesState } from './types'

// Every move the rules accept from the active player right now, for bots and tests.

/** Every placement the active player could make now; a pass only when there is none. */
export function legalActions(state: VotesState): VotesMove[] {
  const placements = PLACEABLE_KINDS.flatMap(tile => legalPlacements(state, tile).map((at): VotesMove => ({ kind: 'place', tile, at })))
  return placements.length ? placements : [{ kind: 'pass' }]
}

/** Every move the active player could make now. Ending the turn comes first, so a bot that values nothing else ends it. */
export function legalMoves(state: VotesState): VotesMove[] {
  switch (state.phase.kind) {
    case 'action':
      return legalActions(state)
    case 'pulling':
      return [{ kind: 'endTurn' }, ...legalPulls(state).map((move): VotesMove => ({ kind: 'pull', ...move }))]
    case 'gameOver':
      return []
  }
}
