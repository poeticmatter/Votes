import { IllegalMoveError, type GameOutcome } from 'game-kit/turns'
import { activePlayerState, cityAt, citiesOf, peopleOnBoard } from './boardQueries'
import { holdElection } from './elections'
import { house, houseWhileForced, isHousingOver } from './housing'
import { arrive, beginImmigration } from './immigration'
import { addMergerMarkers, citiesTouchedBy } from './mergers'
import { hasAnyLegalPlacement, placeTile } from './placement'
import { beginRelocation, isRelocationOver, relocate } from './relocation'
import type { Phase, PlayerColor, VotesMove, VotesState } from './types'

// A turn: place a tile, then its relocation (a School), its immigration (a Factory),
// housing, and a merger with its election if the tile joined cities (they join the
// moment the tile is placed; see mergers.ts). Each move is one
// decision by the active player; everything that needs no decision runs straight on.

type GameOverReason = 'lastMerger' | 'nobodyCanBuild'

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
    phase: { kind: 'placement' },
  }
}

function endTurn(state: VotesState): VotesState {
  const afterMerger = resolveMerger(state)
  if (citiesOf(afterMerger).length === 1) return endGame(afterMerger, 'lastMerger')
  // Passing changes nothing a later placement depends on, so a full round of passes
  // means nobody will ever build again.
  if (afterMerger.consecutivePasses >= afterMerger.players.length) return endGame(afterMerger, 'nobodyCanBuild')
  return startNextTurn(afterMerger)
}

/** Runs the turn on until the active player has a decision to make, or the turn ends. */
function advance(state: VotesState): VotesState {
  if (state.phase.kind === 'relocation') {
    return isRelocationOver(state) ? advance(beginImmigration(state)) : state
  }
  if (state.phase.kind === 'housing') {
    const housed = houseWhileForced(state)
    return isHousingOver(housed) ? endTurn(housed) : housed
  }
  return state
}

function pass(state: VotesState): VotesState {
  if (hasAnyLegalPlacement(state)) throw new IllegalMoveError('You can only pass when no tile fits anywhere')
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
    case 'place':
      requirePhase(state, 'placement')
      return advance(beginRelocation(placeTile(state, move.tile, move.at)))
    case 'pass':
      requirePhase(state, 'placement')
      return advance(beginRelocation(pass(state)))
    case 'relocate':
      requirePhase(state, 'relocation')
      return advance(relocate(state, move))
    case 'arrive':
      requirePhase(state, 'immigration')
      return advance(arrive(state, move.station))
    case 'house':
      requirePhase(state, 'housing')
      return advance(house(state, move))
  }
}
