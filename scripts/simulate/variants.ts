import type { HexKey } from '../../src/game/map/hexGrid'
import { DEFAULT_SETTINGS, NO_TILES } from '../../src/game/rules/setup'
import type { FactoryArrivals, PlaceableKind, VotesSettings } from '../../src/game/rules/types'

// The rule sets the simulations compare. Draft 5.13 is the reference. Every proposed set
// has personal tiles and cubes per tile (proposals 4 and 5) and adds any combination of
// the new tiles. Eminent domain was tested too, and removed. Round 1 kept 5.13's taking and flipping; round 2
// drops both, so a turn is only placing a tile, face up.

export interface Variant {
  /** Short id, for tables. */
  id: string
  description: string
  settings: VotesSettings
}

/** Everything that differs between the proposed rule sets. */
export interface Spec {
  isPlaceOnly: boolean
  factoryArrivals: FactoryArrivals
  /** Each player's own tiles, before the new kinds. */
  residences: number
  factories: number
  schools: number
  hubs: number
  ports: number
  halls: number
  cubes: Record<PlaceableKind, number>
  arrivalsAddCubes: boolean
  closedHexes: HexKey[]
  catchUpCubes: number[]
}

/** Proposal 5: Residences 1, Factories 2, Hubs 0, Ports 3. Schools and Town Halls aren't named; 0. */
export const PROPOSED_CUBES: Record<PlaceableKind, number> = { residence: 1, factory: 2, school: 0, hub: 0, port: 3, hall: 0 }

export const ROUND_ONE_BASE: Spec = {
  isPlaceOnly: false,
  factoryArrivals: 'none',
  residences: 4,
  factories: 2,
  schools: 1,
  hubs: 0,
  ports: 0,
  halls: 0,
  cubes: PROPOSED_CUBES,
  arrivalsAddCubes: true,
  closedHexes: [],
  catchUpCubes: [],
}

/**
 * Round 2: a turn is placing a tile, face up; 8 Residences each. A placed Factory draws a
 * person per city, as a flipped one did: without it, only Ports would bring anyone.
 */
export const PLACE_ONLY_BASE: Spec = { ...ROUND_ONE_BASE, isPlaceOnly: true, factoryArrivals: 'everyCity', residences: 8 }

export function settingsFor(spec: Spec): VotesSettings {
  return {
    ...DEFAULT_SETTINGS,
    tileCounts: NO_TILES,
    catchUpCubes: spec.catchUpCubes,
    personalTiles: {
      residence: spec.residences,
      factory: spec.factories,
      school: spec.schools,
      hub: spec.hubs,
      port: spec.ports,
      hall: spec.halls,
    },
    options: {
      bagCubesOnPlace: spec.cubes,
      isPlaceOnly: spec.isPlaceOnly,
      factoryArrivals: spec.factoryArrivals,
      arrivalsAddCubes: spec.arrivalsAddCubes,
      closedHexes: spec.closedHexes,
    },
  }
}

export interface Additions {
  hubs: boolean
  ports: boolean
  halls: boolean
}

export function withAdditions(base: Spec, { hubs, ports, halls }: Additions): Spec {
  return {
    ...base,
    hubs: hubs ? 1 : 0,
    ports: ports ? 1 : 0,
    halls: halls ? 1 : 0,
  }
}

function additionsId(prefix: string, { hubs, ports, halls }: Additions): string {
  const parts = [hubs && 'hub', ports && 'port', halls && 'hall'].filter(Boolean)
  return [prefix, ...parts].join('+')
}

function additionsDescription(base: string, { hubs, ports, halls }: Additions): string {
  const extras = [hubs && 'Hubs', ports && 'Ports', halls && 'Town Halls'].filter(Boolean)
  return `${base}${extras.length ? `, with ${extras.join(', ')}` : ''}`
}

const flags = [false, true]

const ROUND_ONE_ADDITIONS: Additions[] = flags.flatMap(hubs => flags.map(ports => ({ hubs, ports, halls: false })))

const PLACE_ONLY_ADDITIONS: Additions[] = flags.flatMap(hubs => flags.flatMap(ports => flags.map(halls => ({ hubs, ports, halls }))))

export const REFERENCE: Variant = { id: '5.13', description: 'Draft 5.13 as it is', settings: DEFAULT_SETTINGS }

export const ROUND_ONE: Variant[] = ROUND_ONE_ADDITIONS.map(additions => ({
  id: additionsId('4+5', additions),
  description: additionsDescription('Personal tiles and cubes per tile', additions),
  settings: settingsFor(withAdditions(ROUND_ONE_BASE, additions)),
}))

export const PLACE_ONLY: Variant[] = PLACE_ONLY_ADDITIONS.map(additions => ({
  id: additionsId('P', additions),
  description: additionsDescription('Place-only turns, 8 Residences each', additions),
  settings: settingsFor(withAdditions(PLACE_ONLY_BASE, additions)),
}))

/**
 * Round 3: place-only turns, but a placed Factory brings 2 people for its own city, who
 * may settle in any city its Hubs join it to and go to the best-schooled. Arrivals add
 * no cubes (round 2's "quiet"), so the bag grows only by the placed tiles' cubes.
 */
export const OWN_CITY_BASE: Spec = { ...PLACE_ONLY_BASE, factoryArrivals: 'ownCity', arrivalsAddCubes: false }

export const OWN_CITY: Variant[] = PLACE_ONLY_ADDITIONS.map(additions => ({
  id: additionsId('F', additions),
  description: additionsDescription('Factories bring 2 people to their own city', additions),
  settings: settingsFor(withAdditions(OWN_CITY_BASE, additions)),
}))
