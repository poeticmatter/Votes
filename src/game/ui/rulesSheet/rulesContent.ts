import { DEFAULT_SETTINGS } from '../../rules/setup'
import { OVERCROWDED_AT, RESIDENCES_PER_FACTORY, STARTING_RESIDENCES_PER_PLAYER, type Tile } from '../../rules/types'

// The one-page rules: Draft 5.13 (docs/rules-draft-5.13.md until it replaces
// Rules/Votes.md in the asset generator), condensed.
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

const { startingCubesPerPlayer, greyCubes, tileCounts } = DEFAULT_SETTINGS

/** One paragraph per entry. */
export const LEDE = [
  'Whoever controls the factories controls the economy. Use zoning laws to control the population and get elected mayor of the forming cities.',
  'Votes (temp name) is a 3–5 player game of development and vote manipulation.',
]

export const COMPONENTS: LeadText[] = [
  {
    lead: 'Board',
    text: 'The map, with mountains and 5 town sites, each with a starting Residence. Nothing is placed on mountains.',
  },
  {
    lead: 'Tiles',
    text: `${tileCounts.residence} Residences, ${tileCounts.factory} Factories and ${tileCounts.school} Schools, in a shared supply. Once placed, tiles belong to nobody.`,
  },
  { lead: 'Pieces', text: `Cubes (people) in each player’s colour, ${greyCubes} grey cubes (independents, who never vote) and a bag.` },
]

export const SETUP = [
  'Take 2 cubes of each player’s colour, then add grey cubes until there are 10. Mix them and place 2 at random on each starting Residence.',
  `Put the remaining grey cubes and ${startingCubesPerPlayer} more cubes of each player’s colour in the bag.`,
  `Each player takes ${STARTING_RESIDENCES_PER_PLAYER} Residence tiles from the shared supply into their own supply.`,
  'Choose a first player.',
]

export const CITIES =
  'A city is a group of connected tiles, face down or face up. Each city starts as a single town, its starting Residence; the letter on the Residence names it.'

export const CORE_CONCEPTS: { intro: string; items: LeadText[] } = {
  intro: 'Cubes are people. They live in face-up Residences, which have no limit.',
  items: [
    { lead: 'Overcrowded', text: `A Residence with ${OVERCROWDED_AT} or more people.` },
    {
      lead: 'Immigration',
      text: 'Flipping a Factory draws 1 person from the bag for each city on the board. Each goes into the least crowded Residence of its city; ties, you choose. If the bag is empty, nobody arrives.',
    },
    {
      lead: 'Levelling',
      text: 'A person may move from a Residence to another in the same city that has at least 2 fewer people.',
    },
    {
      lead: 'School pull',
      text: 'A city with a School pulls people from cities without one: a person moves from a Residence there into one in the School city with fewer people. A city with a University also pulls from cities that have a School but no University.',
    },
    {
      lead: 'Movement',
      text: 'After a flip or a School placement, people move until nobody can: levelling first, then School pulls. The most crowded Residence goes first, into the least crowded. You break ties and choose which person moves.',
    },
    {
      lead: 'Votes',
      text: 'Each person who arrives adds 1 of your cubes to the bag, and so does each overcrowded Residence when you promise a new one. Moving adds nothing.',
    },
  ],
}

/** The merger step is drawn as an interchange, like the merger markers on the board. */
export const MERGER_STEP_TITLE = 'Merger'

export const TURN: TitledText[] = [
  {
    title: 'Take, place or flip',
    text: 'Do one: take a Factory or School from the shared supply into yours; place a tile from your supply on an empty hex touching a tile (Residences and Factories face down, Schools face up); or flip any face-down tile, anyone’s.',
  },
  { title: 'Movement', text: 'After a flip or a School placement: levelling, then School pulls, until nobody can move.' },
  {
    title: MERGER_STEP_TITLE,
    text: 'If the tile you placed touches two or more cities, they become one city. Hold an election.',
  },
]

export interface BuildingEntry {
  tile: Tile
  name: string
  text: string
}

export const BUILDINGS: BuildingEntry[] = [
  {
    tile: { kind: 'residence', isFaceDown: false, people: [] },
    name: 'Residence',
    text: 'Placed face down: a promise. Add 1 of your cubes to the bag for each overcrowded Residence in its city. Flipped: a seat, and people level into it.',
  },
  {
    tile: { kind: 'factory', isFaceDown: false },
    name: 'Factory',
    text: `Placed face down: take ${RESIDENCES_PER_FACTORY} Residence tiles into your supply. Flipped: 1 person from the bag for each city. Each face-up Factory scores at elections.`,
  },
  {
    tile: { kind: 'school', isUniversity: false },
    name: 'School',
    text: 'Placed face up: its city pulls people from cities with no School. Only one per city.',
  },
  {
    tile: { kind: 'school', isUniversity: true },
    name: 'University',
    text: 'A School flipped over, only in a city with two (a merger makes those). Its city also pulls from cities with a School but no University.',
  },
]

export const ELECTIONS_INTRO = 'Only the newly merged city votes.'

export const ELECTIONS: TitledText[] = [
  {
    title: 'Seats',
    text: 'Each face-up Residence is a seat. Grey people don’t vote: the player colour with the most cubes on it wins the seat.',
    note: 'Ties go to the tied player colour furthest left. A seat where nobody votes, empty or all grey, belongs to nobody.',
  },
  {
    title: 'Payout',
    text: 'Each seat scores its holder 1 point per face-up Factory in the city.',
    note: 'Grey and empty seats score for nobody. Face-down Factories count for nothing.',
  },
]

export const GAME_END =
  'The game ends after the 4th election, when the last two cities merge. Most points wins. Tiebreak: most cubes on the board.'
