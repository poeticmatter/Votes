import { DEFAULT_SETTINGS } from '../../rules/setup'
import type { Tile } from '../../rules/types'

// The one-page rules: Draft 5.12 (docs/rules-draft-5.12.md until it replaces
// Rules/Votes.md in the asset generator), condensed. The payout table itself comes from
// rules/payout.ts.
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
    text: 'The map, with mountains and 5 town sites, each with a starting Residence.',
  },
  {
    lead: 'Tiles',
    text: `${tileCounts.residence} Residences, ${tileCounts.factory} Factories, ${tileCounts.mine} Mines and ${tileCounts.school} Schools. Tiles belong to nobody.`,
  },
  { lead: 'Pieces', text: `Cubes (people) in each player’s colour, ${greyCubes} grey cubes (independents, who never vote) and a bag.` },
  { lead: 'Payout table', text: 'For elections; it is printed below.' },
]

export const SETUP = [
  'Take 2 cubes of each player’s colour, then add grey cubes until there are 10. Mix them and place 2 at random on each starting Residence.',
  `Put the remaining grey cubes and ${startingCubesPerPlayer} more cubes of each player’s colour in the bag.`,
  'Choose a first player.',
]

export const CITIES =
  'A city is a group of connected tiles. Each city starts as a single town, its starting Residence; the letter on the Residence names it.'

export const CORE_CONCEPTS: { intro: string; items: LeadText[] } = {
  intro: 'Cubes are people. After every tile you place, people arrive and move, one person at a time, until nobody can move:',
  items: [
    {
      lead: 'Immigration',
      text: `A Factory or Mine draws ${arrivals.factory} people from the bag one at a time. Each moves into the least crowded Residence in its city, checked again after each one. If the bag is empty, nobody arrives.`,
    },
    {
      lead: 'Levelling',
      text: 'A person may move from a Residence to another in the same city that has at least 2 fewer people.',
    },
    {
      lead: 'School pull',
      text: 'A city with a School pulls people from cities without one: a person moves from a Residence there into one in the School city with fewer people. A city with a School is never pulled from.',
    },
    {
      lead: 'Order',
      text: 'The most crowded Residence goes first, into the least crowded. You break ties and choose which person moves.',
    },
    {
      lead: 'Votes',
      text: 'For each person who arrives or moves on your turn, add 1 of your cubes to the bag.',
    },
  ],
}

/** The merger step is drawn as an interchange, like the merger markers on the board. */
export const MERGER_STEP_TITLE = 'Merger'

export const TURN: TitledText[] = [
  { title: 'Place a tile', text: 'On an empty hex touching a tile. Only Mines go on mountains.' },
  { title: 'Immigration', text: 'If the tile is a Factory or Mine.' },
  { title: 'Movement', text: 'Levelling and School pulls, until nobody can move.' },
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
    text: 'A seat, with room for anyone. People sit in a row: newcomers join on the right, and when someone leaves, the rest slide left.',
  },
  {
    tile: { kind: 'factory' },
    name: 'Factory',
    text: `Immigration: ${arrivals.factory} people from the bag. At elections, worth 1, +1 if it touches a Mine.`,
  },
  {
    tile: { kind: 'mine' },
    name: 'Mine',
    text: `Placed only on mountains. Immigration: ${arrivals.mine} people from the bag. At elections, worth 2.`,
  },
  {
    tile: { kind: 'school' },
    name: 'School',
    text: 'Its city pulls people from cities with no School. You may not place a School in a city that already has one.',
  },
]

export const ELECTIONS_INTRO = 'Only the newly merged city votes.'

export const ELECTIONS: TitledText[] = [
  {
    title: 'Seats',
    text: 'Each Residence is a seat. Grey people don’t vote: the player colour with the most cubes on it wins the seat.',
    note: 'Ties go to the tied player colour furthest left. A seat where nobody votes, empty or all grey, belongs to nobody.',
  },
  {
    title: 'Payout',
    text: 'Add up the value of the city’s Factories and Mines. Find the points per seat on the payout table, from the city’s value and its number of seats. Each player scores that many points for each seat they hold.',
    note: 'Seats nobody holds count toward the city’s seats but score for nobody. A city with no Factories or Mines pays nothing.',
  },
]

export const GAME_END =
  'The game ends after the 4th election, when the last two cities merge. Most points wins. Tiebreak: most cubes on the board.'
