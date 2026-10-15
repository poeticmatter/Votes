import { IllegalMoveError } from '../../platform/IllegalMoveError'
import { districtOf } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { DistrictId } from '../map/mapData'
import { addToBag, drawFromBag } from './bag'
import { bagSize, openJobs, residencesIn, stations } from './boardQueries'
import { HOMES_PER_RESIDENCE, type PlayerColor, type VotesState } from './types'

// End-of-turn immigration. Every Station brings in one family, in the order the active
// player chooses, while its district has an empty home and the board has an open job.
// Homes and jobs only ever fill up during a turn, so a Station that can't bring a
// family now can't later in the same turn either.

export function residencesWithRoom(state: VotesState, district: DistrictId): HexKey[] {
  return residencesIn(state, district)
    .filter(({ tile }) => tile.families.length < HOMES_PER_RESIDENCE)
    .map(({ key }) => key)
}

export function canStationBringFamily(state: VotesState, station: HexKey): boolean {
  return openJobs(state) > 0 && bagSize(state) > 0 && residencesWithRoom(state, districtOf(station)).length > 0
}

function stationsThatCanBring(state: VotesState, candidates: HexKey[]): HexKey[] {
  return candidates.filter(station => canStationBringFamily(state, station))
}

/** Stations the active player may call next; empty while a drawn family waits for a home. */
export function callableStations(state: VotesState): HexKey[] {
  const { phase } = state
  return phase.kind === 'immigration' && !phase.drawn ? phase.stationsToCall : []
}

/** Residences the drawn family may move into. */
export function homesForDrawnFamily(state: VotesState): HexKey[] {
  const { phase } = state
  if (phase.kind !== 'immigration' || !phase.drawn) return []
  return residencesWithRoom(state, districtOf(phase.drawn.station))
}

export function beginImmigration(state: VotesState): VotesState {
  const allStations = stations(state).map(({ key }) => key)
  return { ...state, phase: { kind: 'immigration', stationsToCall: stationsThatCanBring(state, allStations), drawn: null } }
}

export function isImmigrationOver(state: VotesState): boolean {
  return state.phase.kind === 'immigration' && !state.phase.drawn && state.phase.stationsToCall.length === 0
}

export function callStation(state: VotesState, station: HexKey): VotesState {
  if (!callableStations(state).includes(station)) throw new IllegalMoveError(`Station ${station} can't bring a family now`)
  const { state: drawnState, color } = drawFromBag(state)
  return {
    ...drawnState,
    phase: {
      kind: 'immigration',
      stationsToCall: callableStations(state).filter(key => key !== station),
      drawn: { station, color },
    },
  }
}

/** The Station's owner adds a cube, and so does the Residence's owner unless it's the same player. */
function ownersRewardedFor(stationOwner: PlayerColor, residenceOwner: PlayerColor | null): PlayerColor[] {
  return residenceOwner && residenceOwner !== stationOwner ? [stationOwner, residenceOwner] : [stationOwner]
}

export function settleFamily(state: VotesState, residence: HexKey): VotesState {
  const { phase } = state
  if (phase.kind !== 'immigration' || !phase.drawn) throw new IllegalMoveError('No family is waiting for a home')
  if (!homesForDrawnFamily(state).includes(residence)) throw new IllegalMoveError(`The family can't move into ${residence}`)

  const { station, color } = phase.drawn
  const stationTile = state.tiles[station]
  const residenceTile = state.tiles[residence]
  // Both were validated above; these guards narrow the tile types.
  if (stationTile?.kind !== 'station' || residenceTile?.kind !== 'residence') {
    throw new Error(`Expected a Station at ${station} and a Residence at ${residence}`)
  }

  const addedToBag = ownersRewardedFor(stationTile.owner, residenceTile.owner)
  const housed: VotesState = {
    ...state,
    tiles: { ...state.tiles, [residence]: { ...residenceTile, families: [...residenceTile.families, color] } },
    log: [...state.log, { kind: 'family', turn: state.turn.number, color, station, residence, addedToBag }],
  }
  const rewarded = addedToBag.reduce((current, owner) => addToBag(current, owner, 1), housed)
  return {
    ...rewarded,
    phase: { kind: 'immigration', stationsToCall: stationsThatCanBring(rewarded, phase.stationsToCall), drawn: null },
  }
}
