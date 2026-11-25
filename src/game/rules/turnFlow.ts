import { IllegalMoveError, type GameOutcome } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { activePlayerState, cityAt, citiesOf, peopleOnBoard } from './boardQueries'
import { addSeatCubes, holdElection } from './elections'
import { mergerArrivals, stockFactory } from './arrivals'
import { addMergerMarkers, citiesTouchedBy } from './mergers'
import { placeableKinds, placeTile } from './placement'
import { pull } from './pulls'
import type { Phase, PlaceableKind, PlayerColor, VotesMove, VotesState } from './types'

// A turn: place one tile from your own supply (or pass if none fits), then pull people
// into your Residences and the starting ones, as many as you like, then end the turn. A
// placed Factory draws cubes from the bag. A placement that joins cities (they join the
// moment the tile is placed; see mergers.ts) holds an election, after which every
// Residence of the new city draws 1 person, and then each player adds 1 cube to the bag
// for every seat they won. Nobody moves unless the active player pulls them.

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

/** Joins the cities the placed tile touches, holds their election, brings each Residence there a person, and bags the seats won. */
function resolveMerger(state: VotesState, at: HexKey): VotesState {
  const { joins } = citiesTouchedBy(state, at)
  if (joins.length === 0) return state

  const merged = addMergerMarkers(state, joins)
  const city = cityAt(merged, at)
  const logged: VotesState = {
    ...merged,
    log: [...merged.log, { kind: 'merger', turn: state.turn.number, city, electionNumber: merged.elections.length + 1 }],
  }
  const elected = holdElection(logged, city)
  // The last merger ends the game, so nobody needs to arrive or bag their seats.
  if (citiesOf(elected).length === 1) return elected
  const election = elected.elections[elected.elections.length - 1]
  // The seats' cubes go in only after the arrivals, so none of them can arrive this turn.
  return addSeatCubes(mergerArrivals(elected, city), election)
}

const beginPulling = (state: VotesState): VotesState => ({ ...state, phase: { kind: 'pulling' } })

function place(state: VotesState, kind: PlaceableKind, at: HexKey): VotesState {
  const placed = placeTile({ ...state, consecutivePasses: 0 }, kind, at)
  const stocked = kind === 'factory' ? stockFactory(placed, at) : placed
  const afterMerger = resolveMerger(stocked, at)
  if (citiesOf(afterMerger).length === 1) return endGame(afterMerger, 'lastMerger')
  return beginPulling(afterMerger)
}

/** Whether the active player has a tile they can place. */
export function hasAnyPlacement(state: VotesState): boolean {
  return placeableKinds(state).length > 0
}

function pass(state: VotesState): VotesState {
  if (hasAnyPlacement(state)) throw new IllegalMoveError('You can only pass when no tile in your supply fits')
  const entry = { kind: 'passed' as const, turn: state.turn.number, player: activePlayerState(state).color }
  return beginPulling({ ...state, consecutivePasses: state.consecutivePasses + 1, log: [...state.log, entry] })
}

function endTurn(state: VotesState): VotesState {
  // A full round of players unable to place means nobody ever will again.
  if (state.consecutivePasses >= state.players.length) return endGame(state, 'nobodyCanAct')
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
      requirePhase(state, 'action')
      return place(state, move.tile, move.at)
    case 'pass':
      requirePhase(state, 'action')
      return pass(state)
    case 'pull':
      requirePhase(state, 'pulling')
      return pull(state, move)
    case 'endTurn':
      requirePhase(state, 'pulling')
      return endTurn(state)
  }
}
