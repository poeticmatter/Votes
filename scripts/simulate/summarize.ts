import { PLACEABLE_KINDS } from '../../src/game/rules/placement'
import type { PlaceableKind } from '../../src/game/rules/types'
import type { GameRecord } from './playGame'

// What many games of one rule set add up to. Games of every player count are pooled
// unless a measure says otherwise.

export interface Summary {
  games: number
  finishedShare: number
  turns: number
  elections: number
  lastMergerShare: number
  winnerScore: number
  /** The winner's lead over second place, as a share of the winner's score. */
  relativeMargin: number
  /** Games won by at most 10% of the winner's score, or shared. */
  closeShare: number
  scorelessShare: number
  leadChanges: number
  /** Of games with a sole leader halfway through the elections, the share that leader lost. */
  comebackShare: number
  lastElectionShare: number
  /**
   * How far the turn positions' win shares stray from even, in percentage points: the
   * largest gap, averaged over the player counts.
   */
  seatBias: number
  /** The first player's win share divided by an even share. */
  firstPlayerEdge: number
  /** Win shares by turn position, for each player count. */
  winSharesByCount: Record<number, number[]>
  placed: Record<PlaceableKind, number>
  flips: number
  takes: number
  passes: number
  meanActions: number
  peopleOnBoard: number
  bagAtEnd: number
}

const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

/** Each winner of a shared win counts as a fraction of a win. */
function winShares(records: GameRecord[], playerCount: number): number[] {
  const shares = Array<number>(playerCount).fill(0)
  for (const record of records) for (const winner of record.winners) shares[winner] += 1 / record.winners.length
  return shares.map(share => share / Math.max(1, records.length))
}

function winSharesByCount(records: GameRecord[]): Record<number, number[]> {
  const counts = [...new Set(records.map(record => record.playerCount))]
  return Object.fromEntries(counts.map(count => [count, winShares(records.filter(record => record.playerCount === count), count)]))
}

function seatMeasures(records: GameRecord[]): { seatBias: number; firstPlayerEdge: number } {
  const counts = [...new Set(records.map(record => record.playerCount))]
  const perCount = counts.map(count => {
    const shares = winShares(records.filter(record => record.playerCount === count), count)
    const even = 1 / count
    return { bias: Math.max(...shares.map(share => Math.abs(share - even))) * 100, edge: shares[0] / even }
  })
  return { seatBias: mean(perCount.map(entry => entry.bias)), firstPlayerEdge: mean(perCount.map(entry => entry.edge)) }
}

function relativeMargin(record: GameRecord): number {
  const [first, second] = [...record.scores].sort((a, b) => b - a)
  return first === 0 ? 0 : (first - second) / first
}

export function summarize(records: GameRecord[]): Summary {
  const comebacks = records.flatMap(record => (record.halfwayLeaderLost === null ? [] : [record.halfwayLeaderLost ? 1 : 0]))
  const lastShares = records.flatMap(record => (record.lastElectionShare === null ? [] : [record.lastElectionShare]))
  return {
    games: records.length,
    finishedShare: mean(records.map(record => (record.isFinished ? 1 : 0))),
    turns: mean(records.map(record => record.turns)),
    elections: mean(records.map(record => record.elections)),
    lastMergerShare: mean(records.map(record => (record.endedByLastMerger ? 1 : 0))),
    winnerScore: mean(records.map(record => Math.max(...record.scores))),
    relativeMargin: mean(records.map(relativeMargin)),
    closeShare: mean(records.map(record => (record.winners.length > 1 || relativeMargin(record) <= 0.1 ? 1 : 0))),
    scorelessShare: mean(records.map(record => (Math.max(...record.scores) === 0 ? 1 : 0))),
    leadChanges: mean(records.map(record => record.leadChanges)),
    comebackShare: mean(comebacks),
    lastElectionShare: mean(lastShares),
    ...seatMeasures(records),
    winSharesByCount: winSharesByCount(records),
    placed: Object.fromEntries(PLACEABLE_KINDS.map(kind => [kind, mean(records.map(record => record.placed[kind]))])) as Record<PlaceableKind, number>, // every kind
    flips: mean(records.map(record => record.flips)),
    takes: mean(records.map(record => record.takes)),
    passes: mean(records.map(record => record.passes)),
    meanActions: mean(records.map(record => record.meanActions)),
    peopleOnBoard: mean(records.map(record => record.peopleOnBoard)),
    bagAtEnd: mean(records.map(record => record.bagAtEnd)),
  }
}
