import { GAME_CONFIG } from '../game.config'
import type { Transport, UserRole } from './types'

/** Room codes avoid I and O so they can't be confused with 1 and 0 when read aloud. */
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const ROOM_CODE_LENGTH = 4

export interface RoomLink {
  code: string
  transport: Transport
}

export function generateRoomCode(): string {
  return Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)],
  ).join('')
}

export function readRoomLinkFromUrl(): RoomLink | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('room')
  if (!code) return null
  return { code: code.toUpperCase(), transport: params.get('mode') === 'async' ? 'async' : 'live' }
}

export function buildRoomUrl({ code, transport }: RoomLink): string {
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set('room', code)
  if (transport === 'async') url.searchParams.set('mode', 'async')
  return url.toString()
}

function roleStorageKey(code: string): string {
  return `${GAME_CONFIG.id}-role-${code}`
}

/** Remembers that this browser created the room, so reopening the link resumes as player 1. */
export function rememberRoomCreator(code: string): void {
  try {
    localStorage.setItem(roleStorageKey(code), '1')
  } catch (err) {
    console.warn('Could not persist room role; reopening this link will join as player 2.', err)
  }
}

export function recallRole(code: string): UserRole {
  try {
    return localStorage.getItem(roleStorageKey(code)) === '1' ? 1 : 2
  } catch (err) {
    console.warn('Could not read persisted room role; defaulting to player 2.', err)
    return 2
  }
}
