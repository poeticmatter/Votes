import { IllegalMoveError } from 'game-kit/turns'
import { BOARD, hexAt, isStationSiteInUse } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { activePlayerState } from './boardQueries'
import type { PlayerColor, PlayerState, Tile, TileKind, VotesState } from './types'

export const TILE_KINDS: readonly TileKind[] = ['residence', 'station', 'factory', 'school']

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

/**
 * The hex rules for placing `kind` at `at`, ignoring whose stock it comes from. A Station
 * needs a station site in use, and such a site takes nothing else; a site not in use at
 * this player count is an ordinary hex.
 */
function isLegalHex(state: VotesState, kind: TileKind, at: HexKey): boolean {
  const hex = BOARD.hexByKey.get(at)
  if (!hex || hex.terrain !== 'open' || state.tiles[at]) return false
  const isSiteInUse = isStationSiteInUse(hex, state.players.length)
  if (isSiteInUse !== (kind === 'station')) return false
  return touchesTileInSameDistrict(state, at)
}

/** Hexes where the active player may place `kind` right now. */
export function legalPlacements(state: VotesState, kind: TileKind): HexKey[] {
  if (state.phase.kind !== 'placement' || !hasTileInStock(activePlayerState(state), kind)) return []
  return BOARD.hexes.filter(hex => isLegalHex(state, kind, hex.key)).map(hex => hex.key)
}

export function hasAnyLegalPlacement(state: VotesState): boolean {
  return TILE_KINDS.some(kind => legalPlacements(state, kind).length > 0)
}

/** A fresh tile of `kind` from `owner`'s stock or, for public tiles, the supply. */
export function newTile(kind: TileKind, owner: PlayerColor): Tile {
  if (kind === 'residence' || kind === 'station') return { kind, owner, people: [] }
  return { kind }
}

function takeFromStock(player: PlayerState, kind: TileKind): PlayerState {
  if (kind === 'residence') return { ...player, residencesLeft: player.residencesLeft - 1 }
  if (kind === 'station') return { ...player, stationsLeft: player.stationsLeft - 1 }
  return player
}

/** Places the active player's tile. */
export function placeTile(state: VotesState, kind: TileKind, at: HexKey): VotesState {
  const player = activePlayerState(state)
  if (!hasTileInStock(player, kind)) throw new IllegalMoveError(`${player.color} has no ${kind} left`)
  if (!isLegalHex(state, kind, at)) throw new IllegalMoveError(`A ${kind} can't go on ${at}`)

  return {
    ...state,
    tiles: { ...state.tiles, [at]: newTile(kind, player.color) },
    players: state.players.map((entry, index) => (index === state.turn.playerIndex ? takeFromStock(entry, kind) : entry)),
    turn: { ...state.turn, placedAt: at },
    consecutivePasses: 0,
    log: [...state.log, { kind: 'placed', turn: state.turn.number, player: player.color, tile: kind, at }],
  }
}
