import { IllegalMoveError } from 'game-kit/turns'
import type { HexKey } from '../map/hexGrid'
import type { TownId } from '../map/mapData'
import { addVote, drawFromBag } from './bag'
import { activePlayerState, bagSize, cityAt, citiesOf, crowdOf, residencesInCity, schoolRanks } from './boardQueries'
import { beginMovement, residencesInReach } from './movement'
import type { ArrivalDestination, CubeColor, VotesState } from './types'

// Immigration: flipping a Factory face up draws 1 person from the bag for each city on
// the board, a city at a time in the order of their first towns. Each goes into the least
// crowded face-up Residence of that city; when Residences tie, the active player chooses.
// Every city holds its towns' starting Residences, which are face up from the start, so
// there is always somewhere to go. Each arrival adds 1 of the active player's cubes to
// the bag, which a later draw may bring out. Once the bag is empty nobody else arrives.
//
// A proposed Factory (RuleOptions.factoryArrivals 'ownCity') instead brings 2 people for
// its own city. Each may settle in any city joined to it by Hubs, and goes to the
// best-schooled of them (University, then School, then none), into its least crowded
// Residence; the player breaks ties, across cities too.

const OWN_CITY_ARRIVALS = 2

function fewestPeople(state: VotesState, homes: HexKey[]): HexKey[] {
  const fewest = Math.min(...homes.map(key => crowdOf(state, key)))
  return homes.filter(key => crowdOf(state, key) === fewest)
}

/** The city's face-up Residences that hold the fewest people. */
export function leastCrowdedResidences(state: VotesState, city: TownId[]): HexKey[] {
  const homes = residencesInCity(state, city).map(({ key }) => key)
  if (homes.length === 0) throw new Error(`City ${city.join(' + ')} has no face-up Residence`)
  return fewestPeople(state, homes)
}

/** The least crowded Residences of the best-schooled cities that `city` reaches by Hubs. */
function bestSchooledResidences(state: VotesState, city: TownId[]): HexKey[] {
  const ranks = schoolRanks(state)
  const rankAt = (key: HexKey) => ranks.get(cityAt(state, key)[0]) ?? 0
  const reach = residencesInReach(state, city)
  if (reach.length === 0) throw new Error(`City ${city.join(' + ')} reaches no face-up Residence`)
  const bestRank = Math.max(...reach.map(rankAt))
  return fewestPeople(state, reach.filter(key => rankAt(key) === bestRank))
}

function settle(state: VotesState, color: CubeColor, residence: HexKey): VotesState {
  const tile = state.tiles[residence]
  if (tile?.kind !== 'residence') throw new Error(`Expected a Residence at ${residence}`)
  const voter = state.options.arrivalsAddCubes ? activePlayerState(state).color : null
  const entry = { kind: 'arrived' as const, turn: state.turn.number, color, residence, voter }
  const settled = { ...state, tiles: { ...state.tiles, [residence]: { ...tile, people: [...tile.people, color] } }, log: [...state.log, entry] }
  return voter ? addVote(settled) : settled
}

const cityOf = (state: VotesState, town: TownId): TownId[] => {
  const city = citiesOf(state).find(candidate => candidate[0] === town)
  if (!city) throw new Error(`No city starts with town ${town}`)
  return city
}

function destinationsFor(state: VotesState, town: TownId, destination: ArrivalDestination): HexKey[] {
  const city = cityOf(state, town)
  return destination === 'bestSchooled' ? bestSchooledResidences(state, city) : leastCrowdedResidences(state, city)
}

/** Draws a person for the first of `cities`, settling them unless Residences tie, then goes on to the rest. */
function drawFor(state: VotesState, cities: TownId[], destination: ArrivalDestination): VotesState {
  const [town, ...remainingCities] = cities
  if (!town || bagSize(state) === 0) return beginMovement(state)
  const { state: drawn, color } = drawFromBag(state)
  const residences = destinationsFor(drawn, town, destination)
  if (residences.length > 1) return { ...drawn, phase: { kind: 'arrival', person: color, residences, remainingCities, destination } }
  return drawFor(settle(drawn, color, residences[0]), remainingCities, destination)
}

/** A flipped Factory's (or a Port's) immigration: 1 person for each city on the board. */
export function beginImmigration(state: VotesState): VotesState {
  return drawFor(
    state,
    citiesOf(state).map(city => city[0]),
    'leastCrowded',
  )
}

/** A proposed Factory's arrivals: 2 people for the city of the Factory at `at`. */
export function beginOwnCityArrivals(state: VotesState, at: HexKey): VotesState {
  const town = cityAt(state, at)[0]
  return drawFor(state, Array<TownId>(OWN_CITY_ARRIVALS).fill(town), 'bestSchooled')
}

export function arrive(state: VotesState, residence: HexKey): VotesState {
  const { phase } = state
  if (phase.kind !== 'arrival' || !phase.residences.includes(residence)) {
    throw new IllegalMoveError(`The new person can't move into ${residence}`)
  }
  return drawFor(settle(state, phase.person, residence), phase.remainingCities, phase.destination)
}
