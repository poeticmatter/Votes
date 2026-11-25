import { nextIndex } from 'game-kit/turns'
import { chooseBotMove } from '../../src/game/bot'
import { bagSize, peopleOnBoard } from '../../src/game/rules/boardQueries'
import { legalMoves } from '../../src/game/rules/legalMoves'
import { PLACEABLE_KINDS } from '../../src/game/rules/placement'
import { createInitialState } from '../../src/game/rules/setup'
import { applyMove } from '../../src/game/rules/turnFlow'
import type { PlaceableKind, PlayerColor, VotesMove, VotesSettings, VotesState } from '../../src/game/rules/types'

// Plays one seeded game and measures it. Players are named by turn position (0 is the
// first player), not seat, so results compare across seeds.

const MOVE_LIMIT = 5000

export type Player = (state: VotesState) => VotesMove

export const botPlayer: Player = state => chooseBotMove(state, state.turn.playerIndex)

/** Any legal move, seeded by the state so a game replays the same. */
export const randomPlayer: Player = state => {
  const options = legalMoves(state)
  return options[nextIndex(state.turn.number * 7919 + state.log.length * 31 + state.randomState, options.length).index]
}

/** Plays the bot's move half the time and a random one otherwise: a weaker player, to see how much better play is rewarded. */
export const sloppyPlayer: Player = state => {
  const coin = nextIndex(state.turn.number * 104729 + state.log.length * 13 + state.randomState, 2).index
  return coin === 0 ? botPlayer(state) : randomPlayer(state)
}

export interface GameRecord {
  playerCount: number
  isFinished: boolean
  turns: number
  elections: number
  endedByLastMerger: boolean
  /** By turn position. */
  scores: number[]
  winners: number[]
  /** Times the sole leader changed from one election to the next. */
  leadChanges: number
  /** Whether the sole leader halfway through the elections went on to lose; null without one. */
  halfwayLeaderLost: boolean | null
  /** The winner's points that came from the last election, as a share of their total. */
  lastElectionShare: number | null
  placed: Record<PlaceableKind, number>
  passes: number
  /** Legal actions on offer, averaged over the action-phase decisions. */
  meanActions: number
  peopleOnBoard: number
  bagAtEnd: number
}

function turnPositionOf(state: VotesState, color: PlayerColor): number {
  const seat = state.players.findIndex(player => player.color === color)
  return (seat - state.firstPlayerIndex + state.players.length) % state.players.length
}

/** Each player's cumulative score after each election, by colour. */
function scoreHistory(state: VotesState): Map<PlayerColor, number>[] {
  const running = new Map<PlayerColor, number>(state.players.map(player => [player.color, 0]))
  return state.elections.map(election => {
    for (const [color, points] of Object.entries(election.scores)) running.set(color as PlayerColor, (running.get(color as PlayerColor) ?? 0) + (points ?? 0)) // Object.entries loses the key type
    return new Map(running)
  })
}

function soleLeader(scores: Map<PlayerColor, number>): PlayerColor | null {
  const best = Math.max(...scores.values())
  const leaders = [...scores].filter(([, score]) => score === best)
  return best > 0 && leaders.length === 1 ? leaders[0][0] : null
}

function leadChanges(history: Map<PlayerColor, number>[]): number {
  const leaders = history.map(soleLeader).filter((leader): leader is PlayerColor => leader !== null)
  return leaders.slice(1).filter((leader, index) => leader !== leaders[index]).length
}

function halfwayLeaderLost(state: VotesState, history: Map<PlayerColor, number>[], winners: PlayerColor[]): boolean | null {
  if (history.length < 2) return null
  const leader = soleLeader(history[Math.ceil(history.length / 2) - 1])
  return leader === null ? null : !winners.includes(leader)
}

function lastElectionShare(state: VotesState, winners: PlayerColor[]): number | null {
  const last = state.elections.at(-1)
  const winner = winners[0]
  const total = state.players.find(player => player.color === winner)?.score ?? 0
  if (!last || !winner || total === 0) return null
  return (last.scores[winner] ?? 0) / total
}

function countPlacements(state: VotesState): Record<PlaceableKind, number> {
  const counts = Object.fromEntries(PLACEABLE_KINDS.map(kind => [kind, 0])) as Record<PlaceableKind, number> // filled for every kind
  for (const entry of state.log) if (entry.kind === 'placed') counts[entry.tile] += 1
  return counts
}

const countLog = (state: VotesState, kind: VotesState['log'][number]['kind']) => state.log.filter(entry => entry.kind === kind).length

export function playGame(settings: VotesSettings, playerCount: number, seed: number, playerFor: (turnPosition: number) => Player): GameRecord {
  let state = createInitialState({ settings, playerCount, seed })
  let actionDecisions = 0
  let actionsOffered = 0
  for (let moves = 0; state.phase.kind !== 'gameOver' && moves < MOVE_LIMIT; moves += 1) {
    if (state.phase.kind === 'action') {
      actionDecisions += 1
      actionsOffered += legalMoves(state).length
    }
    const position = (state.turn.playerIndex - state.firstPlayerIndex + playerCount) % playerCount
    state = applyMove(state, playerFor(position)(state))
  }

  const winners = state.phase.kind === 'gameOver' ? state.phase.winners : []
  const history = scoreHistory(state)
  const ending = state.log.find(entry => entry.kind === 'gameOver')
  const byPosition = [...state.players].sort((a, b) => turnPositionOf(state, a.color) - turnPositionOf(state, b.color))
  return {
    playerCount,
    isFinished: state.phase.kind === 'gameOver',
    turns: state.turn.number,
    elections: state.elections.length,
    endedByLastMerger: ending?.kind === 'gameOver' && ending.reason === 'lastMerger',
    scores: byPosition.map(player => player.score),
    winners: winners.map(color => turnPositionOf(state, color)),
    leadChanges: leadChanges(history),
    halfwayLeaderLost: halfwayLeaderLost(state, history, winners),
    lastElectionShare: lastElectionShare(state, winners),
    placed: countPlacements(state),
    passes: countLog(state, 'passed'),
    meanActions: actionDecisions ? actionsOffered / actionDecisions : 0,
    peopleOnBoard: peopleOnBoard(state).length,
    bagAtEnd: bagSize(state),
  }
}
