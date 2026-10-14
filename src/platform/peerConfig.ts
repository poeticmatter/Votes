import { GAME_CONFIG } from '../game.config'
import type { UserRole } from './types'

export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

/** Messages sent between host and guests. The host is authoritative for all state. */
export type PeerMessage<State, Plan> =
  | { type: 'STATE'; state: State; spectatorCount: number }
  | { type: 'ASSIGNED_ROLE'; role: UserRole }
  | { type: 'SUBMIT_PLAN'; plan: Plan }

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
