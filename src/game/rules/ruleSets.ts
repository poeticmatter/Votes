import { DEFAULT_SETTINGS, NO_TILES } from './setup'
import type { VotesSettings } from './types'

// The rule sets a lobby can start a game with. Draft 5.13 is the game as written; the
// others are proposed rules picked out by the simulations (docs/simulations.md) for
// playtesting at the table.

export type RuleSetId = 'draft513' | 'roundThree'

export interface RuleSet {
  id: RuleSetId
  name: string
  summary: string
  settings: VotesSettings
}

/**
 * Round 3's recommended set ("F+hall c01222"): place-only turns, Factories bringing 2
 * people to their own city, a Town Hall each, only placed tiles adding cubes, and catch-up
 * cubes of 0, 1, 2, 2, 2 by turn position. It was the fairest set simulated.
 */
const ROUND_THREE_SETTINGS: VotesSettings = {
  ...DEFAULT_SETTINGS,
  tileCounts: NO_TILES,
  personalTiles: { ...NO_TILES, residence: 8, factory: 2, school: 1, hall: 1 },
  catchUpCubes: [0, 1, 2, 2, 2],
  options: {
    bagCubesOnPlace: { residence: 1, factory: 2, school: 0, hub: 0, port: 3, hall: 0 },
    isPlaceOnly: true,
    factoryArrivals: 'ownCity',
    arrivalsAddCubes: false,
    closedHexes: [],
  },
}

export const RULE_SETS: RuleSet[] = [
  { id: 'draft513', name: 'Draft 5.13', summary: 'The rules as written.', settings: DEFAULT_SETTINGS },
  {
    id: 'roundThree',
    name: 'Round 3 playtest',
    summary: 'Place a tile face up each turn; Factories bring 2 people to their own city; a Town Hall each; catch-up cubes.',
    settings: ROUND_THREE_SETTINGS,
  },
]

/** Which rule set some settings started from: only the Round 3 set has place-only turns. */
export function ruleSetIdOf(settings: VotesSettings): RuleSetId {
  return settings.options.isPlaceOnly ? 'roundThree' : 'draft513'
}
