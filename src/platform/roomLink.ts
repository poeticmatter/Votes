import { GAME_CONFIG } from '../game.config'
import type { Transport, UserRole } from './types'

/** Room codes avoid I and O so they can't be confused with 1 and 0 when read aloud. */
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const ROOM_CODE_LENGTH = 4
const SPECTATOR_VALUE = 'spectator'

export const MAX_PLAYER_NAME_LENGTH = 24

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

export function generateSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]
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

export function normalizePlayerName(name: string): string {
  return name.trim().slice(0, MAX_PLAYER_NAME_LENGTH)
}

const seatStorageKey = (code: string) => `${GAME_CONFIG.id}-seat-${code}`
const NAME_STORAGE_KEY = `${GAME_CONFIG.id}-player-name`

/** Remembers which seat this browser holds, so reopening the link resumes it. */
export function rememberRole(code: string, role: UserRole): void {
  try {
    localStorage.setItem(seatStorageKey(code), String(role))
  } catch (err) {
    console.warn(`Could not remember the seat for room ${code}; reopening the link will ask again.`, err)
  }
}

/** The role this browser took in the room before, or null if it never joined. */
export function recallRole(code: string): UserRole | null {
  try {
    const stored = localStorage.getItem(seatStorageKey(code))
    if (stored === null) return null
    if (stored === SPECTATOR_VALUE) return 'spectator'
    const seat = Number(stored)
    return Number.isInteger(seat) && seat >= 0 ? seat : null
  } catch (err) {
    console.warn(`Could not read the remembered seat for room ${code}.`, err)
    return null
  }
}

/** The name this browser last played under, to prefill the next lobby or join screen. */
export function recallPlayerName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) ?? ''
  } catch (err) {
    console.warn('Could not read the remembered player name.', err)
    return ''
  }
}

export function rememberPlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name)
  } catch (err) {
    console.warn('Could not remember the player name.', err)
  }
}
