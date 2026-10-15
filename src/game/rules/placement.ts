import { IllegalMoveError } from 'game-kit/turns'
import { BOARD, hexAt } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { addToBag } from './bag'
import { activePlayerState } from './boardQueries'
import type { PlayerColor, PlayerState, Tile, TileKind, VotesState } from './types'

export const TILE_KINDS: readonly TileKind[] = ['residence', 'station', 'factory', 'school']

/** Factories and Schools may never be neighbours. */
const FORBIDDEN_NEIGHBOR: Partial<Record<TileKind, TileKind>> = {
  factory: 'school',
  school: 'factory',
}

function hasNeighborOfKind(state: VotesState, at: HexKey, kind: TileKind): boolean {
  return hexAt(at).neighbors.some(({ key }) => state.tiles[key]?.kind === kind)
}

function touchesTileInSameDistrict(state: VotesState, at: HexKey): boolean {
  const { district } = hexAt(at)
  return hexAt(at).neighbors.some(({ key }) => state.tiles[key] && hexAt(key).district === district)
}

/** Whether the player still has this tile to place. Public tiles never run out. */
export function hasTileInStock(player: PlayerState, kind: TileKind): boolean {
  if (kind === 'residence') return player.residencesLeft > 0
  if (kind === 'station') return player.stationsLeft > 0
  return true
}

/** The hex rules for placing `kind` at `at`, ignoring whose stock it comes from. */
function isLegalHex(state: VotesState, kind: TileKind, at: HexKey): boolean {
  const hex = BOARD.hexByKey.get(at)
  if (!hex || hex.terrain !== 'open' || state.tiles[at]) return false
  if (!touchesTileInSameDistrict(state, at)) return false
  if (kind === 'station' && !hex.bordersRail) return false
  const forbidden = FORBIDDEN_NEIGHBOR[kind]
  return !forbidden || !hasNeighborOfKind(state, at, forbidden)
}

/** Hexes where the active player may place `kind` right now. */
export function legalPlacements(state: VotesState, kind: TileKind): HexKey[] {
  if (state.phase.kind !== 'placement' || !hasTileInStock(activePlayerState(state), kind)) return []
  return BOARD.hexes.filter(hex => isLegalHex(state, kind, hex.key)).map(hex => hex.key)
}

export function hasAnyLegalPlacement(state: VotesState): boolean {
  return TILE_KINDS.some(kind => legalPlacements(state, kind).length > 0)
}

/**
 * Families in Residences next to `at` that a School there would reward. Residences
 * already next to another School don't count.
 */
export function schoolBonusAt(state: VotesState, at: HexKey): number {
  return hexAt(at).neighbors.reduce((total, { key }) => {
    const tile = state.tiles[key]
    if (tile?.kind !== 'residence') return total
    const isNextToOtherSchool = hexAt(key).neighbors.some(
      neighbor => neighbor.key !== at && state.tiles[neighbor.key]?.kind === 'school',
    )
    return isNextToOtherSchool ? total : total + tile.families.length
  }, 0)
}

/** A fresh tile of `kind` from `owner`'s stock or, for public tiles, the supply. */
export function newTile(kind: TileKind, owner: PlayerColor): Tile {
  if (kind === 'residence') return { kind, owner, families: [] }
  if (kind === 'station') return { kind, owner }
  return { kind }
}

function takeFromStock(player: PlayerState, kind: TileKind): PlayerState {
  if (kind === 'residence') return { ...player, residencesLeft: player.residencesLeft - 1 }
  if (kind === 'station') return { ...player, stationsLeft: player.stationsLeft - 1 }
  return player
}

function awardSchoolBonus(state: VotesState, at: HexKey): VotesState {
  const cubes = schoolBonusAt(state, at)
  if (cubes === 0) return state
  const player = activePlayerState(state).color
  return {
    ...addToBag(state, player, cubes),
    log: [...state.log, { kind: 'schoolBonus', turn: state.turn.number, player, cubes }],
  }
}

/** Places the active player's tile and pays any School bonus. */
export function placeTile(state: VotesState, kind: TileKind, at: HexKey): VotesState {
  const player = activePlayerState(state)
  if (!hasTileInStock(player, kind)) throw new IllegalMoveError(`${player.color} has no ${kind} left`)
  if (!isLegalHex(state, kind, at)) throw new IllegalMoveError(`A ${kind} can't go on ${at}`)

  const placed: VotesState = {
    ...state,
    tiles: { ...state.tiles, [at]: newTile(kind, player.color) },
    players: state.players.map((entry, index) => (index === state.turn.playerIndex ? takeFromStock(entry, kind) : entry)),
    turn: { ...state.turn, placedAt: at },
    consecutivePasses: 0,
    log: [...state.log, { kind: 'placed', turn: state.turn.number, player: player.color, tile: kind, at }],
  }
  return kind === 'school' ? awardSchoolBonus(placed, at) : placed
}
