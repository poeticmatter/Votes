import { DEFAULT_SETTINGS } from '../../rules/setup'
import type { Tile } from '../../rules/types'

// The one-page rules: Rules/Votes.md (Draft 5.10) in the asset generator, condensed. The
// payout table itself comes from rules/payout.ts.
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

const { arrivals, startingCubesPerPlayer, greyCubes, tileCounts } = DEFAULT_SETTINGS

/** One paragraph per entry. */
export const LEDE = [
  'Whoever controls the factories controls the economy. Use zoning laws to control the population and get elected mayor of the forming cities.',
  'Votes (temp name) is a 3–5 player game of development and vote manipulation.',
]

export const COMPONENTS: LeadText[] = [
  {
    lead: 'Board',
    text: 'The map, with mountains and 5 town sites. Each town site has a starting Residence with a printed Station beside it. A rail line connects the Stations.',
  },
  {
    lead: 'Tiles',
    text: `${tileCounts.residence} Residences, ${tileCounts.factory} Factories, ${tileCounts.mine} Mines and ${tileCounts.school} Schools. Tiles belong to nobody.`,
  },
  { lead: 'Pieces', text: `Cubes (people) in each player’s colour, ${greyCubes} grey cubes (independents) and a bag.` },
  { lead: 'Payout table', text: 'For elections; it is printed below.' },
]

export const SETUP = [
  'Take 2 cubes of each player’s colour, then add grey cubes until there are 10. Mix them and place 2 at random on each starting Residence.',
  `Put the remaining grey cubes and ${startingCubesPerPlayer} more cubes of each player’s colour in the bag.`,
  'Choose a first player.',
]

export const CITIES =
  'A city is a group of connected tiles and Stations. Each city starts as a single town: a starting Residence and its Station; the letter on the Residence names it.'

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
    {
      lead: 'Votes',
      text: 'For each person who moves into a Residence on your turn, add 1 of your cubes to the bag.',
    },
  ],
}

/** The merger step is drawn as an interchange, like the merger markers on the board. */
export const MERGER_STEP_TITLE = 'Merger'

export const TURN: TitledText[] = [
  { title: 'Place a tile', text: 'On an empty hex touching a tile or Station. Only Mines go on mountains.' },
  { title: 'Relocation', text: 'If the tile has one.' },
  { title: 'Immigration', text: 'If the tile has one.' },
  { title: 'Housing', text: 'Relocation may have freed space, so people can cascade into it.' },
  {
    title: MERGER_STEP_TITLE,
    text: 'If the tile touches two or more cities, they become one city. Hold an election.',
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
    text: `Immigration: ${arrivals.factory} people arrive at a Station in its city. At elections, worth 1, +1 if it borders the rail, +1 if it touches a Mine.`,
  },
  {
    tile: { kind: 'mine' },
    name: 'Mine',
    text: `Placed only on mountains. Immigration: ${arrivals.mine} people arrive at a Station in its city. At elections, worth 2.`,
  },
  {
    tile: { kind: 'school' },
    name: 'School',
    text: 'Relocation: move 1 person into each adjacent Residence that touches no other School, even a full one. Each comes from any Station, or any Residence that touches no School.',
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
    note: 'Ties go to the tied colour furthest left. An empty seat belongs to nobody.',
  },
  {
    title: 'Payout',
    text: 'Add up the value of the city’s Factories and Mines. Find the points per seat on the payout table, from the city’s value and its number of seats. Each player scores that many points for each seat they hold.',
    note: 'Grey and empty seats count toward the city’s seats but score for nobody. A city with no Factories or Mines pays nothing.',
  },
]

export const GAME_END =
  'The game ends after the 4th election, when the last two cities merge. Most points wins. Tiebreak: most cubes on the board.'
