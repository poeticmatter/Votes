import { DEFAULT_SETTINGS } from '../../rules/setup'
import type { Tile } from '../../rules/types'

// The one-page rules: Rules/Votes.md (Draft 5.7) in the asset generator, condensed.
// Player colours go by the names the game shows: Cobalt, Saffron, Orchid, Jade. Town
// colours likewise: Sand, Sage, Slate.

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

/** One paragraph per entry. */
export const LEDE = [
  'Whoever controls the factories controls the economy. Use zoning laws to control the population and get elected mayor of the forming cities.',
  'Votes (temp name) is a 2–5 player game of development and vote manipulation.',
]

export const COMPONENTS: LeadText[] = [
  {
    lead: 'Board',
    text: 'The map, with 5 town sites, each with a printed Station beside it, a rail along hex edges that runs past every Station, and mountains that can’t be built on.',
  },
  {
    lead: 'Tiles',
    text: 'In 3 town colours, Sand, Sage and Slate, belonging to nobody: 5 starting Residences (2 + 2 + 1 in the town colours), then Residences, Factories and Schools in each colour.',
  },
  { lead: 'Pieces', text: 'Cubes (people) in each player’s colour, 10 grey cubes (independents), a bag and 4 merger markers.' },
]

export const SETUP = [
  'Shuffle the starting Residences and place one on each town site. Each town, and its Station, now has a colour.',
  'Take 2 cubes of each player’s colour, then add grey cubes until there are 10. Mix them and place 2 at random on each starting Residence.',
  'Put the remaining grey cubes and 2 more cubes of each player’s colour in the bag.',
  'Choose a first player.',
]

export const TOWNS_AND_CITIES =
  'A town is its starting Residence, its Station, and every connected tile of its colour; the letter on its starting Residence names it. A city is one or more towns that have merged. At the start, each town is its own city.'

export const CORE_CONCEPTS: { intro: string; items: LeadText[] } = {
  intro: 'Cubes are people. Every tile you place brings people in or moves them around, in one of three ways:',
  items: [
    { lead: 'Relocation', text: 'Move people already on the board, as the tile says.' },
    {
      lead: 'Immigration',
      text: 'People arrive by train and wait at a Station: draw them from the bag and place them on it. If the bag is empty, nobody arrives.',
    },
    {
      lead: 'Housing',
      text: 'Move people waiting at Stations into Residences with space in the same city, as many as fit. You choose who. A Residence with 3 people is full.',
    },
    { lead: 'Votes', text: 'For each person who moves into a Residence on your turn, add 1 of your cubes to the bag.' },
  ],
}

/** The merger step is drawn as an interchange, like the merger markers. */
export const MERGER_STEP_TITLE = 'Merger'

export const TURN: TitledText[] = [
  {
    title: 'Place a tile',
    text: 'Of any colour, on an empty hex next to another tile of the same colour. You may not place a tile that connects two towns of the same colour.',
  },
  { title: 'Relocation', text: 'If the tile has one.' },
  { title: 'Immigration', text: 'If the tile has one.' },
  { title: 'Housing', text: 'Relocation may have freed space, so people can cascade into it.' },
  {
    title: MERGER_STEP_TITLE,
    text: 'If the tile touches a tile of a different colour that belongs to another city, those cities become one. Put the next merger marker on that edge and hold an election.',
  },
]

export interface BuildingEntry {
  tile: Tile
  name: string
  text: string
}

// The icons only show each tile's look, so they're all drawn as Sage tiles of town A.
export const BUILDINGS: BuildingEntry[] = [
  {
    tile: { kind: 'residence', color: 'sage', town: 'A', people: [] },
    name: 'Residence',
    text: 'Holds 3 people and is 1 seat.',
  },
  {
    tile: { kind: 'factory', color: 'sage', town: 'A' },
    name: 'Factory',
    text: `Immigration: ${ARRIVALS} people at its town’s Station. At elections, worth 1 point, or 2 if it borders the rail.`,
  },
  {
    tile: { kind: 'school', color: 'sage', town: 'A' },
    name: 'School',
    text: 'Relocation: move 1 person from anywhere on the board into each adjacent Residence, even a full one. Votes: add 1 of your cubes to the bag for each adjacent Residence that touches no other School.',
  },
  {
    tile: { kind: 'station', color: 'sage', town: 'A', people: [] },
    name: 'Station',
    text: 'Printed beside each town site, in its town’s colour. People wait here to be housed.',
  },
]

export const ELECTIONS_INTRO = 'Only the newly merged city votes.'

export const ELECTIONS: TitledText[] = [
  {
    title: 'Seats',
    text: 'Each Residence is a seat. The colour with the most cubes on it wins the seat.',
    note: 'Ties go to grey, so an empty Residence is grey’s.',
  },
  {
    title: 'Payout',
    text: 'The player with the most seats in the city scores its Factories: 1 point each, or 2 for one bordering the rail. Tied players each score. If grey has the most, nobody scores.',
  },
]

export const GAME_END =
  'The game ends after the 4th election, when the last two cities merge and the last merger marker is placed. Most points wins. Tiebreak: most cubes on the board.'
