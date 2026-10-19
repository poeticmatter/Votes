import { DEFAULT_SETTINGS } from '../../rules/setup'
import type { Tile } from '../../rules/types'

// The one-page rules: Rules/Votes.md (Draft 5.8, with neighbors and ties going left) in the asset generator, condensed.
// Player colours go by the names the game shows: Cobalt, Saffron, Orchid, Jade.

export interface LeadText {
  lead: string
  text: string
}

export interface TitledText {
  title: string
  text: string
  note?: string
}

const ARRIVALS = DEFAULT_SETTINGS.factoryArrivals
const BAG_CUBES = DEFAULT_SETTINGS.startingCubesPerPlayer

/** One paragraph per entry. */
export const LEDE = [
  'Whoever controls the factories controls the economy. Use zoning laws to control the population and get elected mayor of the forming cities.',
  'Votes (temp name) is a 2–5 player game of development and vote manipulation.',
]

export const COMPONENTS: LeadText[] = [
  {
    lead: 'Board',
    text: 'The map, with impassable mountains and 5 town sites. Each town site has a starting Residence with a printed Station beside it. A rail line connects the Stations.',
  },
  { lead: 'Tiles', text: 'Residences, Factories and Schools. Tiles belong to nobody.' },
  { lead: 'Pieces', text: 'Cubes (people) in each player’s colour, a few grey cubes (independents), a bag and 4 merger markers.' },
]

export const SETUP = [
  'Take 2 cubes of each player’s colour, then add grey cubes until there are 10. Mix them and place 2 at random on each starting Residence.',
  `Put ${BAG_CUBES} more cubes of each player’s colour in the bag. No grey cubes go in the bag.`,
  'Choose a first player.',
]

export const CITIES =
  'A city is a group of connected tiles and Stations. Each city starts as a single town: a starting Residence and its Station. Two cities are neighbors if any of their Stations are one stop apart by rail.'

export const CORE_CONCEPTS: { intro: string; items: LeadText[] } = {
  intro: 'Cubes are people. People may move within their city, or from a neighboring city. Every tile you place brings people in or moves them around, in one of three ways:',
  items: [
    { lead: 'Relocation', text: 'Move people already on the board, as the tile says.' },
    {
      lead: 'Immigration',
      text: 'People arrive by train and wait at a Station: draw them from the bag and place them on it. If the bag is empty, nobody arrives.',
    },
    {
      lead: 'Housing',
      text: 'Move people waiting at Stations into Residences with space, as many as fit. You choose who. A Residence with 3 people is full.',
    },
    {
      lead: 'Votes',
      text: 'Each person who moves into a Residence from within the same city on your turn adds 1 of your cubes to the bag. People from a neighboring city add none.',
    },
  ],
}

/** The merger step is drawn as an interchange, like the merger markers. */
export const MERGER_STEP_TITLE = 'Merger'

export const TURN: TitledText[] = [
  { title: 'Place a tile', text: 'On an empty hex touching a tile or Station.' },
  { title: 'Relocation', text: 'If the tile has one.' },
  { title: 'Immigration', text: 'If the tile has one.' },
  { title: 'Housing', text: 'Relocation may have freed space, so people can cascade into it.' },
  {
    title: MERGER_STEP_TITLE,
    text: 'If the tile touches two or more cities, they become one city. Put a merger marker on each edge it joins and hold an election.',
  },
]

export interface BuildingEntry {
  tile: Tile
  name: string
  text: string
}

export const BUILDINGS: BuildingEntry[] = [
  {
    tile: { kind: 'residence', people: [] },
    name: 'Residence',
    text: 'Holds 3 people and is 1 seat. People sit in a row: newcomers join on the right, and when someone leaves, the rest slide left.',
  },
  {
    tile: { kind: 'factory' },
    name: 'Factory',
    text: `Immigration: ${ARRIVALS} people arrive at a Station in its city. At elections, worth 1 point, or 2 if it borders the rail.`,
  },
  {
    tile: { kind: 'school' },
    name: 'School',
    text: 'Relocation: move 1 person into an adjacent Residence that touches no other School, even a full one.',
  },
  {
    tile: { kind: 'station', people: [] },
    name: 'Station',
    text: 'Printed beside each starting Residence. People wait here to be housed.',
  },
]

export const ELECTIONS_INTRO = 'Only the newly merged city votes.'

export const ELECTIONS: TitledText[] = [
  {
    title: 'Seats',
    text: 'Each Residence is a seat. The colour with the most cubes on it wins the seat.',
    note: 'Ties go to the tied colour furthest left. An empty Residence counts for nobody.',
  },
  {
    title: 'Payout',
    text: 'The player with the most seats in the city scores its Factories: 1 point each, or 2 for one bordering the rail. Tied players each score. If grey has the most seats, nobody scores.',
  },
]

export const GAME_END =
  'The game ends after the 4th election, when the last two cities merge. Most points wins. Tiebreak: most cubes on the board.'
