import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { addToBag } from './bag'
import { activePlayerState, cityAt, crowdOf, residencesInCity, schoolsIn, tilesInBoardOrder } from './boardQueries'
import { placeTile, withActivePlayer } from './placement'
import {
  OVERCROWDED_AT,
  RESIDENCES_PER_FACTORY,
  TAKEABLE_KINDS,
  type FlippedInto,
  type PlaceableKind,
  type TakeableKind,
  type Tile,
  type VotesState,
} from './types'

// A turn's one action, besides placing (placement.ts): taking a tile from the shared
// supply, or flipping a tile. Placing a tile face down is a promise, kept when someone
// flips it:
// - A Residence placed face down adds 1 of the placer's cubes to the bag for each
//   overcrowded Residence in its city. Flipped, it becomes a seat.
// - A Factory placed face down gives the placer Residence tiles from the shared supply.
//   Flipped, it brings people (immigration.ts) and scores at elections.
// - A School is placed face up. Flipped, it becomes a University, but only in a city
//   with two Schools, which only a merger can make.

/** Kinds the active player may take from the shared supply now. */
export function takeableKinds(state: VotesState): TakeableKind[] {
  if (state.phase.kind !== 'action' || state.options.isPlaceOnly) return []
  return TAKEABLE_KINDS.filter(kind => state.supply[kind] > 0)
}

export function takeTile(state: VotesState, kind: TakeableKind): VotesState {
  if (!takeableKinds(state).includes(kind)) throw new IllegalMoveError(`You can't take a ${kind} tile now`)
  const taken = withActivePlayer(state, player => ({ ...player, supply: { ...player.supply, [kind]: player.supply[kind] + 1 } }))
  return {
    ...taken,
    supply: { ...state.supply, [kind]: state.supply[kind] - 1 },
    log: [...state.log, { kind: 'took', turn: state.turn.number, player: activePlayerState(state).color, tile: kind }],
  }
}

/** How many of the city's Residences, around the tile at `key`, are overcrowded. */
export function overcrowdedAround(state: VotesState, key: HexKey): number {
  return residencesInCity(state, cityAt(state, key)).filter(({ key: home }) => crowdOf(state, home) >= OVERCROWDED_AT).length
}

function promiseResidence(state: VotesState, at: HexKey): VotesState {
  const player = activePlayerState(state).color
  const votes = overcrowdedAround(state, at)
  const promised = addToBag(state, player, votes)
  return { ...promised, log: [...promised.log, { kind: 'promised', turn: state.turn.number, player, votes }] }
}

function promiseFactory(state: VotesState): VotesState {
  const count = Math.min(RESIDENCES_PER_FACTORY, state.supply.residence)
  const rewarded = withActivePlayer(state, player => ({ ...player, supply: { ...player.supply, residence: player.supply.residence + count } }))
  const entry = { kind: 'gotResidences' as const, turn: state.turn.number, player: activePlayerState(state).color, count }
  return { ...rewarded, supply: { ...state.supply, residence: state.supply.residence - count }, log: [...state.log, entry] }
}

/** With cubes per tile (a proposed rule), the tile adds its kind's cubes of the placer's colour to the bag. */
function bagCubesFor(state: VotesState, kind: PlaceableKind, cubesByKind: Record<PlaceableKind, number>): VotesState {
  const player = activePlayerState(state).color
  const count = cubesByKind[kind]
  const bagged = addToBag(state, player, count)
  return { ...bagged, log: [...bagged.log, { kind: 'bagged', turn: state.turn.number, player, tile: kind, count }] }
}

/**
 * Places a tile from the active player's supply, with whatever its placing promises: the
 * 5.13 promises of face-down Residences and Factories, or the cubes per tile that
 * replace them. Whatever follows (a Port's arrivals, movement) is up to the turn.
 */
export function placeAndPromise(state: VotesState, kind: PlaceableKind, at: HexKey): VotesState {
  const placed = placeTile(state, kind, at)
  const { bagCubesOnPlace } = state.options
  if (bagCubesOnPlace) return bagCubesFor(placed, kind, bagCubesOnPlace)
  if (kind === 'residence') return promiseResidence(placed, at)
  if (kind === 'factory') return promiseFactory(placed)
  return placed
}

/** What flipping the tile would make of it, or null if it can't be flipped now. */
function flipInto(state: VotesState, key: HexKey, tile: Tile): FlippedInto | null {
  if (tile.kind === 'residence' || tile.kind === 'factory') return tile.isFaceDown ? tile.kind : null
  if (tile.kind !== 'school' || tile.isUniversity) return null
  return schoolsIn(state, cityAt(state, key)) >= 2 ? 'university' : null
}

/** Tiles the active player may flip now: any face-down tile, anyone's, and Schools in a city with two. */
export function flipTargets(state: VotesState): HexKey[] {
  if (state.phase.kind !== 'action' || state.options.isPlaceOnly) return []
  return tilesInBoardOrder(state)
    .filter(({ key, tile }) => flipInto(state, key, tile) !== null)
    .map(({ key }) => key)
}

function flipped(tile: Tile): Tile {
  if (tile.kind === 'school') return { ...tile, isUniversity: true }
  if (tile.kind === 'residence' || tile.kind === 'factory') return { ...tile, isFaceDown: false }
  throw new Error(`A ${tile.kind} can't be flipped`)
}

/** Flips the tile at `at`. What follows (immigration or movement) is up to the turn. */
export function flipTile(state: VotesState, at: HexKey): { state: VotesState; into: FlippedInto } {
  const tile = state.tiles[at]
  const into = tile ? flipInto(state, at, tile) : null
  if (!tile || !into || state.phase.kind !== 'action') throw new IllegalMoveError(`The tile at ${at} can't be flipped`)
  const entry = { kind: 'flipped' as const, turn: state.turn.number, player: activePlayerState(state).color, at, into }
  return { state: { ...state, tiles: { ...state.tiles, [at]: flipped(tile) }, log: [...state.log, entry] }, into }
}
