import { IllegalMoveError, type GameOutcome } from 'game-kit/turns'
import { activePlayerState, cityAt, citiesOf, peopleOnBoard } from './boardQueries'
import { holdElection } from './elections'
import type { HexKey } from '../map/hexGrid'
import { flipTargets, flipTile, placeAndPromise, takeableKinds, takeTile } from './actions'
import { arrive, beginImmigration } from './immigration'
import { addMergerMarkers, citiesTouchedBy } from './mergers'
import { beginMovement, isMovementOver, moveOnePerson, moveWhileForced } from './movement'
import { placeableKinds } from './placement'
import type { Phase, PlayerColor, VotesMove, VotesState } from './types'

// A turn is one action: take a tile from the shared supply, place one from your own, or
// flip one. Placing a School, or flipping anything, moves people (levelling, then School
// pulls) until nobody can move; flipping a Factory first brings people from the bag.
// Nothing else changes where people want to be. A placement that joins cities (they join
// the moment the tile is placed; see mergers.ts) then holds an election. Each move is one
// decision by the active player; everything that needs no decision runs straight on.

type GameOverReason = 'lastMerger' | 'nobodyCanAct'

/** Whose decision the game is waiting for, or null once it's over. */
export function activePlayerIndex(state: VotesState): number | null {
  return state.phase.kind === 'gameOver' ? null : state.turn.playerIndex
}

function requirePhase(state: VotesState, kind: Phase['kind']): void {
  if (state.phase.kind !== kind) throw new IllegalMoveError(`Expected the ${kind} phase, not ${state.phase.kind}`)
}

function cubesOnBoardOf(state: VotesState, color: PlayerColor): number {
  return peopleOnBoard(state).filter(person => person === color).length
}

/** Most points wins; most cubes on the board breaks a tie. Anyone still tied shares the win. */
export function findWinners(state: VotesState): PlayerColor[] {
  const bestScore = Math.max(...state.players.map(player => player.score))
  const leaders = state.players
    .filter(player => player.score === bestScore)
    .map(player => ({ color: player.color, cubes: cubesOnBoardOf(state, player.color) }))
  const mostCubes = Math.max(...leaders.map(leader => leader.cubes))
  return leaders.filter(leader => leader.cubes === mostCubes).map(leader => leader.color)
}

/** A finished game's winners and scores by seat, for GameKit's solo playtest summary. */
export function gameOutcome(state: VotesState): GameOutcome {
  if (state.phase.kind !== 'gameOver') throw new Error('Only a finished game has an outcome')
  const { winners } = state.phase
  return {
    winners: state.players.flatMap((player, seat) => (winners.includes(player.color) ? [seat] : [])),
    scores: state.players.map(player => player.score),
  }
}

function endGame(state: VotesState, reason: GameOverReason): VotesState {
  const winners = findWinners(state)
  return {
    ...state,
    phase: { kind: 'gameOver', winners },
    log: [...state.log, { kind: 'gameOver', turn: state.turn.number, winners, reason }],
  }
}

function resolveMerger(state: VotesState): VotesState {
  const at = state.turn.placedAt
  if (!at) return state
  const { joins } = citiesTouchedBy(state, at)
  if (joins.length === 0) return state

  const merged = addMergerMarkers(state, joins)
  const city = cityAt(merged, at)
  const logged: VotesState = {
    ...merged,
    log: [...merged.log, { kind: 'merger', turn: state.turn.number, city, electionNumber: merged.elections.length + 1 }],
  }
  return holdElection(logged, city)
}

function startNextTurn(state: VotesState): VotesState {
  return {
    ...state,
    turn: {
      number: state.turn.number + 1,
      playerIndex: (state.turn.playerIndex + 1) % state.players.length,
      placedAt: null,
    },
    phase: { kind: 'action' },
  }
}

function endTurn(state: VotesState): VotesState {
  const afterMerger = resolveMerger(state)
  if (citiesOf(afterMerger).length === 1) return endGame(afterMerger, 'lastMerger')
  // Passing changes nothing a later action depends on, so a full round of passes means
  // nobody will ever act again.
  if (afterMerger.consecutivePasses >= afterMerger.players.length) return endGame(afterMerger, 'nobodyCanAct')
  return startNextTurn(afterMerger)
}

/** Runs the turn on until the active player has a decision to make, or the turn ends. */
function advance(state: VotesState): VotesState {
  if (state.phase.kind === 'movement') {
    const moved = moveWhileForced(state)
    return isMovementOver(moved) ? endTurn(moved) : moved
  }
  return state
}

/** Whether the active player has any action: a tile to take, place or flip. */
export function hasAnyAction(state: VotesState): boolean {
  return takeableKinds(state).length > 0 || placeableKinds(state).length > 0 || flipTargets(state).length > 0
}

/** An action other than a pass breaks a run of passes. */
const acted = (state: VotesState): VotesState => ({ ...state, consecutivePasses: 0 })

/** Flips a tile; a Factory brings people first, and then everyone moves. */
function flip(state: VotesState, at: HexKey): VotesState {
  const { state: flipped, into } = flipTile(acted(state), at)
  return into === 'factory' ? beginImmigration(flipped) : beginMovement(flipped)
}

function pass(state: VotesState): VotesState {
  if (hasAnyAction(state)) throw new IllegalMoveError('You can only pass when you have no action')
  return {
    ...state,
    consecutivePasses: state.consecutivePasses + 1,
    log: [...state.log, { kind: 'passed', turn: state.turn.number, player: activePlayerState(state).color }],
  }
}

/**
 * Whether `move` draws cubes from the bag. It can't be undone then: the player would
 * have seen what came out and could take the move back to choose differently. Throws
 * {@link IllegalMoveError} for a move that breaks the rules.
 */
export function drawsFromBag(state: VotesState, move: VotesMove): boolean {
  return applyMove(state, move).randomState !== state.randomState
}

/** Applies the active player's move. Throws {@link IllegalMoveError} if it breaks the rules. */
export function applyMove(state: VotesState, move: VotesMove): VotesState {
  switch (move.kind) {
    case 'take':
      requirePhase(state, 'action')
      return endTurn(takeTile(acted(state), move.tile))
    case 'place': {
      requirePhase(state, 'action')
      const placed = placeAndPromise(acted(state), move.tile, move.at)
      // Only a School changes where people want to be; face-down promises move nobody.
      return move.tile === 'school' ? advance(beginMovement(placed)) : endTurn(placed)
    }
    case 'flip':
      requirePhase(state, 'action')
      return advance(flip(state, move.at))
    case 'pass':
      requirePhase(state, 'action')
      // Every turn ends with nobody able to move, and a pass changes nothing, so the turn just ends.
      return endTurn(pass(state))
    case 'arrive':
      requirePhase(state, 'arrival')
      return advance(arrive(state, move.residence))
    case 'move':
      requirePhase(state, 'movement')
      return advance(moveOnePerson(state, move))
  }
}
