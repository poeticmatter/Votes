import { GAME_CONFIG } from '../game.config'
import type { PlayerIndex, PlayerProfile, UserRole } from './types'

export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

/** Sent by the host, which is authoritative for all state. */
export type HostMessage<State> =
  | { type: 'SNAPSHOT'; state: State; version: number; players: PlayerProfile[]; playerCount: number }
  | { type: 'ROLE'; role: UserRole }

/** Sent by guests. Moves carry the version they were made on, so stale ones are dropped. */
export type GuestMessage<Move> =
  | { type: 'CLAIM_SEAT'; name: string }
  | { type: 'RESUME_SEAT'; seat: PlayerIndex }
  | { type: 'WATCH' }
  | { type: 'MOVE'; version: number; move: Move }

/**
 * Room ids live in the public PeerJS server's global namespace, so they are prefixed
 * with the game id to keep lab games from joining each other's rooms.
 */
export function hostPeerId(roomCode: string): string {
  return `${GAME_CONFIG.id}-${roomCode}`
}

export function describePeerError(err: Error & { type: string }): string {
  if (err.type === 'unavailable-id') return 'Room code already in use.'
  if (err.type === 'peer-unavailable') return 'Room not found. The host may have closed the game.'
  return err.message || 'Connection error.'
}
