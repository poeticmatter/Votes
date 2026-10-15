import { IllegalMoveError } from 'game-kit/turns'
import { districtOf } from '../map/board'
import type { HexKey } from '../map/hexGrid'
import type { DistrictId } from '../map/mapData'
import { addToBag, drawFromBag } from './bag'
import { bagSize, openJobs, residencesIn, stations } from './boardQueries'
import { HOMES_PER_RESIDENCE, type PlayerColor, type VotesState } from './types'

// Immigration runs right after the tile is placed and keeps going while any Station
// can bring a family: its district has an empty home, the board has an open job, and
// the bag isn't empty. The active player picks the Station each time, and the home once
// the cube is drawn. A Station can bring any number of families.
//
// Paying the bag: each family pays its Residence's owner 1 cube, and the first family
// to enter a district this turn pays every Station owner in that district 1 cube.

export function residencesWithRoom(state: VotesState, district: DistrictId): HexKey[] {
  return residencesIn(state, district)
    .filter(({ tile }) => tile.families.length < HOMES_PER_RESIDENCE)
    .map(({ key }) => key)
}

export function canStationBringFamily(state: VotesState, station: HexKey): boolean {
  return openJobs(state) > 0 && bagSize(state) > 0 && residencesWithRoom(state, districtOf(station)).length > 0
}

function stationsThatCanBring(state: VotesState): HexKey[] {
  return stations(state)
    .map(({ key }) => key)
    .filter(station => canStationBringFamily(state, station))
}

/** Stations the active player may call next; empty while a drawn family waits for a home. */
export function callableStations(state: VotesState): HexKey[] {
  const { phase } = state
  return phase.kind === 'immigration' && !phase.drawn ? stationsThatCanBring(state) : []
}

/** Residences the drawn family may move into. */
export function homesForDrawnFamily(state: VotesState): HexKey[] {
  const { phase } = state
  if (phase.kind !== 'immigration' || !phase.drawn) return []
  return residencesWithRoom(state, districtOf(phase.drawn.station))
}

export function beginImmigration(state: VotesState): VotesState {
  return { ...state, phase: { kind: 'immigration', districtsEntered: [], drawn: null } }
}

export function isImmigrationOver(state: VotesState): boolean {
  return state.phase.kind === 'immigration' && !state.phase.drawn && stationsThatCanBring(state).length === 0
}

export function callStation(state: VotesState, station: HexKey): VotesState {
  const { phase } = state
  if (phase.kind !== 'immigration' || !callableStations(state).includes(station)) {
    throw new IllegalMoveError(`Station ${station} can't bring a family now`)
  }
  const { state: drawnState, color } = drawFromBag(state)
  return { ...drawnState, phase: { ...phase, drawn: { station, color } } }
}

/** Every player with a Station in the district, once each, in board order. */
function stationOwnersIn(state: VotesState, district: DistrictId): PlayerColor[] {
  const owners = stations(state)
    .filter(({ key }) => districtOf(key) === district)
    .map(({ tile }) => tile.owner)
  return [...new Set(owners)]
}

export function settleFamily(state: VotesState, residence: HexKey): VotesState {
  const { phase } = state
  if (phase.kind !== 'immigration' || !phase.drawn) throw new IllegalMoveError('No family is waiting for a home')
  if (!homesForDrawnFamily(state).includes(residence)) throw new IllegalMoveError(`The family can't move into ${residence}`)

  const { station, color } = phase.drawn
  const residenceTile = state.tiles[residence]
  // Validated above; this guard narrows the tile type.
  if (residenceTile?.kind !== 'residence') throw new Error(`Expected a Residence at ${residence}`)

  const district = districtOf(residence)
  const isFirstInDistrict = !phase.districtsEntered.includes(district)
  const addedToBag = [
    ...(isFirstInDistrict ? stationOwnersIn(state, district) : []),
    ...(residenceTile.owner ? [residenceTile.owner] : []),
  ]
  const housed: VotesState = {
    ...state,
    tiles: { ...state.tiles, [residence]: { ...residenceTile, families: [...residenceTile.families, color] } },
    phase: {
      kind: 'immigration',
      districtsEntered: isFirstInDistrict ? [...phase.districtsEntered, district] : phase.districtsEntered,
      drawn: null,
    },
    log: [...state.log, { kind: 'family', turn: state.turn.number, color, station, residence, addedToBag }],
  }
  return addedToBag.reduce((current, owner) => addToBag(current, owner, 1), housed)
}
