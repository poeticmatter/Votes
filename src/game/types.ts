import type { PlayerSlot } from '../platform/types'

export type Hand = 'rock' | 'paper' | 'scissors'

export interface RpsSettings {
  /** Round wins needed to take the match. */
  targetScore: number
}

export interface RpsPlan {
  turn: number
  hand: Hand
}

export interface RoundResult {
  p1Hand: Hand
  p2Hand: Hand
  /** Null on a draw. */
  winner: PlayerSlot | null
}

export interface RpsState {
  turn: number
  targetScore: number
  scores: Record<PlayerSlot, number>
  lastRound: RoundResult | null
  matchWinner: PlayerSlot | null
}
