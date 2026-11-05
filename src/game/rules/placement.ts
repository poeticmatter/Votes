import { IllegalMoveError } from 'game-kit/turns'
import { BOARD } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import { activePlayerState, cityAt, schoolCities } from './boardQueries'
import type { PlaceableKind, PlayerState, Tile, VotesState } from './types'

// Placing a tile from your own supply, as your turn's action. Residences and Factories go
// face down, as promises; Schools go face up. Every tile goes on an empty open hex
// touching a tile; mountains take nothing.

export const PLACEABLE_KINDS: readonly PlaceableKind[] = ['residence', 'factory', 'school']

/**
 * An empty open hex touching a tile. A School may not go in a city that already has
 * one, nor join one.
 */
function isLegalHex(state: VotesState, kind: PlaceableKind, at: HexKey): boolean {
  const hex = BOARD.hexByKey.get(at)
  if (!hex || hex.terrain !== 'open' || state.tiles[at]) return false
  const touched = hex.neighbors.filter(({ key }) => state.tiles[key])
  if (touched.length === 0) return false
  if (kind !== 'school') return true
  const schools = schoolCities(state)
  return touched.every(({ key }) => !schools.has(cityAt(state, key)[0]))
}

/** Hexes where the active player may place a tile of `kind` from their supply right now; none if they have none. */
export function legalPlacements(state: VotesState, kind: PlaceableKind): HexKey[] {
  if (state.phase.kind !== 'action' || activePlayerState(state).supply[kind] === 0) return []
  return BOARD.hexes.filter(hex => isLegalHex(state, kind, hex.key)).map(hex => hex.key)
}

/** Kinds in the active player's supply that fit somewhere. */
export function placeableKinds(state: VotesState): PlaceableKind[] {
  return PLACEABLE_KINDS.filter(kind => legalPlacements(state, kind).length > 0)
}

/** A tile as it's placed: Residences and Factories face down, Schools face up. */
export function newTile(kind: PlaceableKind): Tile {
  if (kind === 'residence') return { kind, isFaceDown: true, people: [] }
  if (kind === 'factory') return { kind, isFaceDown: true }
  return { kind, isUniversity: false }
}

/** Updates the active player, for actions that change their supply. */
export function withActivePlayer(state: VotesState, update: (player: PlayerState) => PlayerState): VotesState {
  const index = state.turn.playerIndex
  return { ...state, players: state.players.map((player, seat) => (seat === index ? update(player) : player)) }
}

/** Moves a tile from the active player's supply onto the map. */
export function placeTile(state: VotesState, kind: PlaceableKind, at: HexKey): VotesState {
  const player = activePlayerState(state)
  if (player.supply[kind] === 0) throw new IllegalMoveError(`You have no ${kind} tile to place`)
  if (!isLegalHex(state, kind, at)) throw new IllegalMoveError(`A ${kind} can't go on ${at}`)
  const placed = withActivePlayer(state, current => ({ ...current, supply: { ...current.supply, [kind]: current.supply[kind] - 1 } }))
  return {
    ...placed,
    tiles: { ...state.tiles, [at]: newTile(kind) },
    turn: { ...state.turn, placedAt: at },
    log: [...state.log, { kind: 'placed', turn: state.turn.number, player: player.color, tile: kind, at }],
  }
}
