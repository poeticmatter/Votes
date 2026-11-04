import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import { addVote, drawFromBag } from './bag'
import { activePlayerState, bagSize, cityAt, crowdOf, residencesInCity } from './boardQueries'
import { beginMovement } from './movement'
import type { CubeColor, IndustryKind, VotesState } from './types'

// Immigration: a new Factory or Mine draws people from the bag one at a time, and each
// moves into the least crowded Residence of its city, rechecked after every arrival. When
// Residences tie, the active player chooses. Each arrival adds 1 of the active player's
// cubes to the bag, which a later draw may bring out. Once the bag is empty nobody else
// arrives.

/** The Factory or Mine placed this turn, if that's what it was. */
function placedIndustry(state: VotesState): IndustryKind | null {
  const at = state.turn.placedAt
  const kind = at ? state.tiles[at]?.kind : undefined
  return kind === 'factory' || kind === 'mine' ? kind : null
}

/** How many people this turn's tile brings from the bag. */
export function arrivalCount(state: VotesState): number {
  const kind = placedIndustry(state)
  return kind ? state.arrivals[kind] : 0
}

/** The Residences of the placed tile's city that hold the fewest people. */
export function leastCrowdedResidences(state: VotesState): HexKey[] {
  const at = state.turn.placedAt
  if (!at) return []
  const homes = residencesInCity(state, cityAt(state, at)).map(({ key }) => key)
  const fewest = Math.min(...homes.map(key => crowdOf(state, key)))
  return homes.filter(key => crowdOf(state, key) === fewest)
}

function settle(state: VotesState, color: CubeColor, residence: HexKey): VotesState {
  const tile = state.tiles[residence]
  if (tile?.kind !== 'residence') throw new Error(`Expected a Residence at ${residence}`)
  const voter = activePlayerState(state).color
  const entry = { kind: 'arrived' as const, turn: state.turn.number, color, residence, voter }
  return addVote({
    ...state,
    tiles: { ...state.tiles, [residence]: { ...tile, people: [...tile.people, color] } },
    log: [...state.log, entry],
  })
}

/** Draws the next of `remaining` people, settling them unless Residences tie for least crowded. */
function drawNext(state: VotesState, remaining: number): VotesState {
  if (remaining === 0 || bagSize(state) === 0) return beginMovement(state)
  const { state: drawn, color } = drawFromBag(state)
  const residences = leastCrowdedResidences(drawn)
  if (residences.length > 1) return { ...drawn, phase: { kind: 'arrival', person: color, residences, remaining: remaining - 1 } }
  return drawNext(settle(drawn, color, residences[0]), remaining - 1)
}

/** Starts this turn's immigration; a tile that isn't a Factory or Mine brings nobody. */
export function beginImmigration(state: VotesState): VotesState {
  return drawNext(state, arrivalCount(state))
}

export function arrive(state: VotesState, residence: HexKey): VotesState {
  const { phase } = state
  if (phase.kind !== 'arrival' || !phase.residences.includes(residence)) {
    throw new IllegalMoveError(`The new person can't move into ${residence}`)
  }
  return drawNext(settle(state, phase.person, residence), phase.remaining)
}
