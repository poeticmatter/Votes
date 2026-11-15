import { flipTargets, takeableKinds } from './actions'
import { movementMoves } from './movement'
import { legalPlacements, PLACEABLE_KINDS } from './placement'
import type { VotesMove, VotesState } from './types'

// Every move the rules accept from the active player right now, for bots and tests.

/** Every action the active player could take now; a pass only when there is none. */
export function legalActions(state: VotesState): VotesMove[] {
  const takes = takeableKinds(state).map(tile => ({ kind: 'take' as const, tile }))
  const placements = PLACEABLE_KINDS.flatMap(tile => legalPlacements(state, tile).map(at => ({ kind: 'place' as const, tile, at })))
  const flips = flipTargets(state).map(at => ({ kind: 'flip' as const, at }))
  const actions = [...takes, ...placements, ...flips]
  return actions.length ? actions : [{ kind: 'pass' }]
}

/** Every move the active player could make now. */
export function legalMoves(state: VotesState): VotesMove[] {
  const { phase } = state
  if (phase.kind === 'arrival') return phase.residences.map(residence => ({ kind: 'arrive', residence }))
  if (phase.kind === 'movement') return movementMoves(state).map(move => ({ kind: 'move', ...move }))
  if (phase.kind === 'gameOver') return []
  return legalActions(state)
}
