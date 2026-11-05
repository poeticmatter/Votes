import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { addVote, drawFromBag } from './bag'
import { activePlayerState, bagSize, citiesOf, crowdOf, residencesInCity } from './boardQueries'
import { beginMovement } from './movement'
import type { CubeColor, VotesState } from './types'

// Immigration: flipping a Factory face up draws 1 person from the bag for each city on
// the board, a city at a time in the order of their first towns. Each goes into the least
// crowded face-up Residence of that city; when Residences tie, the active player chooses.
// Every city holds its towns' starting Residences, which are face up from the start, so
// there is always somewhere to go. Each arrival adds 1 of the active player's cubes to
// the bag, which a later draw may bring out. Once the bag is empty nobody else arrives.

/** The city's face-up Residences that hold the fewest people. */
export function leastCrowdedResidences(state: VotesState, city: TownId[]): HexKey[] {
  const homes = residencesInCity(state, city).map(({ key }) => key)
  if (homes.length === 0) throw new Error(`City ${city.join(' + ')} has no face-up Residence`)
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

const cityOf = (state: VotesState, town: TownId): TownId[] => {
  const city = citiesOf(state).find(candidate => candidate[0] === town)
  if (!city) throw new Error(`No city starts with town ${town}`)
  return city
}

/** Draws a person for the first of `cities`, settling them unless Residences tie, then goes on to the rest. */
function drawFor(state: VotesState, cities: TownId[]): VotesState {
  const [town, ...remainingCities] = cities
  if (!town || bagSize(state) === 0) return beginMovement(state)
  const { state: drawn, color } = drawFromBag(state)
  const residences = leastCrowdedResidences(drawn, cityOf(drawn, town))
  if (residences.length > 1) return { ...drawn, phase: { kind: 'arrival', person: color, residences, remainingCities } }
  return drawFor(settle(drawn, color, residences[0]), remainingCities)
}

/** A flipped Factory's immigration: 1 person for each city on the board. */
export function beginImmigration(state: VotesState): VotesState {
  return drawFor(state, citiesOf(state).map(city => city[0]))
}

export function arrive(state: VotesState, residence: HexKey): VotesState {
  const { phase } = state
  if (phase.kind !== 'arrival' || !phase.residences.includes(residence)) {
    throw new IllegalMoveError(`The new person can't move into ${residence}`)
  }
  return drawFor(settle(state, phase.person, residence), phase.remainingCities)
}
