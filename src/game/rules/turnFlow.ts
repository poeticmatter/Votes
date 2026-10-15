import { IllegalMoveError, type GameOutcome } from 'game-kit/turns'
import { activePlayerState, familiesOnBoard } from './boardQueries'
import { holdElection } from './elections'
import { beginImmigration, callStation, isImmigrationOver, settleFamily } from './immigration'
import { citiesJoinedBy, mergeCities } from './mergers'
import { hasAnyLegalPlacement, placeTile } from './placement'
import type { Phase, PlayerColor, VotesMove, VotesState } from './types'

// A turn: place a tile, immigration until no Station can bring anyone, then a merger
// and its election if the tile joined cities. Each move is one decision by the active
// player; everything that needs no decision runs straight on.

type GameOverReason = 'lastMerger' | 'nobodyCanBuild'

/** Whose decision the game is waiting for, or null once it's over. */
export function activePlayerIndex(state: VotesState): number | null {
  return state.phase.kind === 'gameOver' ? null : state.turn.playerIndex
}

function requirePhase(state: VotesState, kind: Phase['kind']): void {
  if (state.phase.kind !== kind) throw new IllegalMoveError(`Expected the ${kind} phase, not ${state.phase.kind}`)
}

function cubesOnBoardOf(state: VotesState, color: PlayerColor): number {
  return familiesOnBoard(state).filter(family => family === color).length
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

/** A finished game's winners and scores by seat, for GameKit's hot-seat playtest summary. */
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
  const joins = citiesJoinedBy(state, at)
  if (joins.length === 0) return state

  const { state: merged, city } = mergeCities(state, at, joins)
  const logged: VotesState = {
    ...merged,
    log: [...merged.log, { kind: 'merger', turn: state.turn.number, city, electionNumber: merged.elections.length + 1 }],
  }
  return holdElection(logged)
}

function startNextTurn(state: VotesState): VotesState {
  return {
    ...state,
    turn: {
      number: state.turn.number + 1,
      playerIndex: (state.turn.playerIndex + 1) % state.players.length,
      placedAt: null,
    },
    phase: { kind: 'placement' },
  }
}

function endTurn(state: VotesState): VotesState {
  const afterMerger = resolveMerger(state)
  if (afterMerger.cities.length === 1) return endGame(afterMerger, 'lastMerger')
  // Passing changes nothing a later placement depends on, so a full round of passes
  // means nobody will ever build again.
  if (afterMerger.consecutivePasses >= afterMerger.players.length) return endGame(afterMerger, 'nobodyCanBuild')
  return startNextTurn(afterMerger)
}

function continueTurn(state: VotesState): VotesState {
  return isImmigrationOver(state) ? endTurn(state) : state
}

function pass(state: VotesState): VotesState {
  if (hasAnyLegalPlacement(state)) throw new IllegalMoveError('You can only pass when no tile fits anywhere')
  return {
    ...state,
    consecutivePasses: state.consecutivePasses + 1,
    log: [...state.log, { kind: 'passed', turn: state.turn.number, player: activePlayerState(state).color }],
  }
}

/** Applies the active player's move. Throws {@link IllegalMoveError} if it breaks the rules. */
export function applyMove(state: VotesState, move: VotesMove): VotesState {
  switch (move.kind) {
    case 'place':
      requirePhase(state, 'placement')
      return continueTurn(beginImmigration(placeTile(state, move.tile, move.at)))
    case 'pass':
      requirePhase(state, 'placement')
      return continueTurn(beginImmigration(pass(state)))
    case 'callStation':
      requirePhase(state, 'immigration')
      return callStation(state, move.station)
    case 'settleFamily':
      requirePhase(state, 'immigration')
      return continueTurn(settleFamily(state, move.residence))
  }
}
