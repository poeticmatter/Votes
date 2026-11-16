import { OWN_CITY_BASE, PLACE_ONLY_BASE, ROUND_ONE_BASE, settingsFor, withAdditions, type Spec, type Variant } from './variants'

// Changes of one number (or one added tile) to a proposed rule set, to see which way
// each dial pushes the game.

interface Tweak {
  id: string
  description: string
  spec: Spec
}

const ALL = withAdditions(ROUND_ONE_BASE, { hubs: true, ports: true, halls: false })
const roundOneWith = (hubs: boolean, ports: boolean, halls: boolean) => withAdditions(ROUND_ONE_BASE, { hubs, ports, halls })

/** Round 1: 5.13's taking and flipping, 4 Residences each. */
const ROUND_ONE_TWEAKS: Tweak[] = [
  { id: '4+5+hall', description: 'Plus a Town Hall each', spec: roundOneWith(false, false, true) },
  { id: 'hub+hall', description: 'Hubs, plus a Town Hall each', spec: roundOneWith(true, false, true) },
  { id: 'port+hall', description: 'Ports, plus a Town Hall each', spec: roundOneWith(false, true, true) },
  { id: 'hub+port+hall', description: 'Hubs and Ports, plus a Town Hall each', spec: roundOneWith(true, true, true) },
  { id: 'all+hall', description: 'Hubs and Ports, plus a Town Hall each', spec: roundOneWith(true, true, true) },
  { id: 'hub+port+hall 3F', description: 'Hubs, Ports and a Town Hall each, 3 Factories each', spec: { ...roundOneWith(true, true, true), factories: 3 } },
  { id: 'all port=2c', description: 'Everything, a Port adds 2 cubes', spec: { ...ALL, cubes: { ...ALL.cubes, port: 2 } } },
  { id: 'all 2 ports', description: 'Everything, 2 Ports each', spec: { ...ALL, ports: 2 } },
  { id: 'all 2 hubs', description: 'Everything, 2 Hubs each', spec: { ...ALL, hubs: 2 } },
  { id: 'all school=1c', description: 'Everything, a School adds 1 cube', spec: { ...ALL, cubes: { ...ALL.cubes, school: 1 } } },
  { id: 'all 3R', description: 'Everything, 3 Residences each (not 4)', spec: { ...ALL, residences: 3 } },
  { id: 'all 3F', description: 'Everything, 3 Factories each (not 2)', spec: { ...ALL, factories: 3 } },
]

const placeOnlyWith = (hubs: boolean, ports: boolean, halls: boolean) => withAdditions(PLACE_ONLY_BASE, { hubs, ports, halls })

/** Catch-up cubes by places after the first player. */
const PER_PLACE = [0, 1, 2, 3, 4]
const FLAT = [0, 1, 1, 1, 1]
const HALF = [0, 1, 1, 2, 2]

/** Round 2: place-only turns, 8 Residences each. */
const PLACE_ONLY_TWEAKS: Tweak[] = [
  { id: 'P quiet', description: 'Arrivals add no cubes', spec: { ...PLACE_ONLY_BASE, arrivalsAddCubes: false } },
  { id: 'P+hall quiet', description: 'Town Halls; arrivals add no cubes', spec: { ...placeOnlyWith(false, false, true), arrivalsAddCubes: false } },
  { id: 'P+hub+hall quiet', description: 'Hubs and Town Halls; arrivals add no cubes', spec: { ...placeOnlyWith(true, false, true), arrivalsAddCubes: false } },
  { id: 'P+port+hall quiet', description: 'Ports and Town Halls; arrivals add no cubes', spec: { ...placeOnlyWith(false, true, true), arrivalsAddCubes: false } },
  { id: 'P+hub+port+hall quiet', description: 'Hubs, Ports and Town Halls; arrivals add no cubes', spec: { ...placeOnlyWith(true, true, true), arrivalsAddCubes: false } },
  { id: 'P+all quiet', description: 'Everything; arrivals add no cubes', spec: { ...placeOnlyWith(true, true, true), arrivalsAddCubes: false } },
  { id: 'P+hall quiet cu1', description: 'Town Halls; quiet arrivals; 1 catch-up cube per place', spec: { ...placeOnlyWith(false, false, true), arrivalsAddCubes: false, catchUpCubes: PER_PLACE } },
  { id: 'P+hall quiet cu2', description: 'Town Halls; quiet arrivals; 2 catch-up cubes per place', spec: { ...placeOnlyWith(false, false, true), arrivalsAddCubes: false, catchUpCubes: PER_PLACE.map(cubes => cubes * 2) } },
  { id: 'P+all quiet cu1', description: 'Everything; quiet arrivals; 1 catch-up cube per place', spec: { ...placeOnlyWith(true, true, true), arrivalsAddCubes: false, catchUpCubes: PER_PLACE } },
  { id: 'P+all quiet cu2', description: 'Everything; quiet arrivals; 2 catch-up cubes per place', spec: { ...placeOnlyWith(true, true, true), arrivalsAddCubes: false, catchUpCubes: PER_PLACE.map(cubes => cubes * 2) } },
  { id: 'P+hall quiet flat', description: 'Town Halls; quiet arrivals; 1 catch-up cube for everyone after the first player', spec: { ...placeOnlyWith(false, false, true), arrivalsAddCubes: false, catchUpCubes: FLAT } },
  { id: 'P+hall quiet half', description: 'Town Halls; quiet arrivals; catch-up cubes 0, 1, 1, 2, 2', spec: { ...placeOnlyWith(false, false, true), arrivalsAddCubes: false, catchUpCubes: HALF } },
  { id: 'P+all quiet flat', description: 'Everything; quiet arrivals; 1 catch-up cube for everyone after the first player', spec: { ...placeOnlyWith(true, true, true), arrivalsAddCubes: false, catchUpCubes: FLAT } },
  { id: 'P+all quiet half', description: 'Everything; quiet arrivals; catch-up cubes 0, 1, 1, 2, 2', spec: { ...placeOnlyWith(true, true, true), arrivalsAddCubes: false, catchUpCubes: HALF } },
  { id: 'P no draws', description: 'Placed Factories bring nobody', spec: { ...PLACE_ONLY_BASE, factoryArrivals: 'none' } },
  { id: 'P+all no draws', description: 'Everything, placed Factories bring nobody', spec: { ...placeOnlyWith(true, true, true), factoryArrivals: 'none' } },
]

export const TWEAKS: Variant[] = [...ROUND_ONE_TWEAKS, ...PLACE_ONLY_TWEAKS].map(({ id, description, spec }) => ({ id, description, settings: settingsFor(spec) }))

/**
 * Round 3's catch-up schedules: extra cubes of their own colour in the bag for the
 * players after the first, by place; the second player gets fewer than the later ones.
 */
const CATCH_UP_SCHEDULES: number[][] = [HALF, [0, 1, 2, 2, 2], [0, 1, 2, 3, 3], PER_PLACE, [0, 0, 1, 1, 2]]

const ownCityWith = (hubs: boolean, ports: boolean, halls: boolean) => withAdditions(OWN_CITY_BASE, { hubs, ports, halls })

const CATCH_UP_BASES: Tweak[] = [
  { id: 'F', description: 'Own-city Factories', spec: ownCityWith(false, false, false) },
  { id: 'F+hall', description: 'Own-city Factories, Town Halls', spec: ownCityWith(false, false, true) },
  { id: 'F+hub+hall', description: 'Own-city Factories, Hubs, Town Halls', spec: ownCityWith(true, false, true) },
  { id: 'F+hub+port+hall', description: 'Own-city Factories, everything', spec: ownCityWith(true, true, true) },
]

export const CATCH_UP: Variant[] = CATCH_UP_BASES.flatMap(({ id, description, spec }) =>
  CATCH_UP_SCHEDULES.map(schedule => ({
    id: `${id} c${schedule.join('')}`,
    description: `${description}; catch-up cubes ${schedule.join(', ')}`,
    settings: settingsFor({ ...spec, catchUpCubes: schedule }),
  })),
)

/** Round 3, every tile together, with Hubs adding 2 cubes to the bag (not 0). */
const EVERYTHING = ownCityWith(true, true, true)
const HUB_CUBES = { ...EVERYTHING, cubes: { ...EVERYTHING.cubes, hub: 2 } }

export const HUB_CUBE_SETS: Variant[] = [[], HALF, [0, 1, 2, 2, 2], [0, 0, 1, 1, 2]].map(schedule => ({
  id: `F+all hub2c${schedule.length ? ` c${schedule.join('')}` : ''}`,
  description: `Own-city Factories, everything, Hubs add 2 cubes${schedule.length ? `; catch-up cubes ${schedule.join(', ')}` : ''}`,
  settings: settingsFor({ ...HUB_CUBES, catchUpCubes: schedule }),
}))
