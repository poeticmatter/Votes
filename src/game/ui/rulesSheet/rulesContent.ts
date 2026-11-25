import { STARTING_FACTORIES } from '../../map/mapData'
import { DEFAULT_SETTINGS } from '../../rules/setup'
import {
  FACTORY_DRAW,
  FACTORY_PULL_LIMIT,
  RESIDENCE_PULL_GAP,
  STARTING_CUBES_PER_FACTORY,
  STARTING_CUBES_PER_PLAYER,
  STARTING_CUBES_PER_RESIDENCE,
  type PlaceableKind,
} from '../../rules/types'

// The one-page rules, condensed: Draft 5.13 with players' own tiles, Factories stocked from
// the bag, voluntary pulls and printed Factories. Player colours go by the names the game
// shows: Cobalt, Saffron, Orchid, Jade.

export interface LeadText {
  lead: string
  text: string
}

export interface TitledText {
  title: string
  text: string
  note?: string
}

const { tilesPerPlayer, bagCubesPerPlayer, bagSize } = DEFAULT_SETTINGS

/** One paragraph per entry. */
export const LEDE = [
  'Whoever controls the factories controls the economy. Use zoning laws to control the population and get elected mayor of the forming cities.',
  'Votes (temp name) is a 3–5 player game of development and vote manipulation.',
]

export const COMPONENTS: LeadText[] = [
  {
    lead: 'Board',
    text: `The map, with mountains and 5 town sites, each with a starting Residence, and ${STARTING_FACTORIES.length} printed Factories. Nothing is placed on mountains. The printed tiles belong to nobody.`,
  },
  {
    lead: 'Tiles',
    text: `Each player has their own ${tilesPerPlayer.residence} Residences, ${tilesPerPlayer.factory} Factories and ${tilesPerPlayer.school} School. A placed tile still belongs to its placer.`,
  },
  { lead: 'Pieces', text: 'Cubes (people) in each player’s colour, grey cubes (independents, who never vote) and a bag.' },
]

export const SETUP = [
  `Take ${STARTING_CUBES_PER_PLAYER} cubes of each player’s colour and add grey cubes until there are 10. Mix them and place ${STARTING_CUBES_PER_RESIDENCE} at random on each starting Residence.`,
  `Do the same again for the printed Factories: ${STARTING_CUBES_PER_PLAYER} of each colour, grey to 10, ${STARTING_CUBES_PER_FACTORY} at random on each.`,
  `Put ${bagCubesPerPlayer} cubes of each player’s colour in the bag and add grey cubes until there are ${bagSize}.`,
  'Each player takes their tiles. Choose a first player.',
]

export const CITIES =
  'A city is a group of connected tiles. Each city starts as a single town, its starting Residence (and any printed Factory beside it); the letter on the Residence names it.'

export const CORE_CONCEPTS: { intro: string; items: LeadText[] } = {
  intro: 'Cubes are people. They live in Residences, which have no limit. Cubes on a Factory wait there until a Residence pulls them in. Nobody moves unless a player pulls them.',
  items: [
    {
      lead: 'Pulling',
      text: 'After placing a tile, pull people one at a time into your own Residences or the starting ones, as many as you like. A Residence in a city with a School may pull from any city; otherwise only from its own.',
    },
    {
      lead: 'From a Factory',
      text: `Only while the Residence holds fewer than ${FACTORY_PULL_LIMIT} people. The Factory’s owner adds 1 cube to the bag (grey for a printed Factory).`,
    },
    {
      lead: 'From a Residence',
      text: `Only one holding at least ${RESIDENCE_PULL_GAP} more people than the Residence pulling.`,
    },
    {
      lead: 'Schools',
      text: 'Each person pulled from another city has a School owner in the pulling city add 1 cube to the bag; with two owners, the puller chooses which.',
    },
  ],
}

/** The merger step is drawn as an interchange, like the merger markers on the board. */
export const MERGER_STEP_TITLE = 'Merger'

export const TURN: TitledText[] = [
  {
    title: 'Place a tile',
    text: `Place a tile from your supply on an empty hex touching a tile. A Factory draws ${FACTORY_DRAW} cubes from the bag onto itself. If nothing fits, pass.`,
  },
  {
    title: MERGER_STEP_TITLE,
    text: 'If the tile touches two or more cities, they become one city. Hold an election, then each of the new city’s Residences draws 1 person from the bag. Then each player adds 1 cube to the bag per seat they won.',
  },
  { title: 'Pull', text: 'Pull people into your Residences and the starting ones, as many as you like, then end your turn.' },
]

export interface BuildingEntry {
  kind: PlaceableKind
  name: string
  text: string
}

export const BUILDINGS: BuildingEntry[] = [
  {
    kind: 'residence',
    name: 'Residence',
    text: 'A seat. Only its owner may pull people into it; anyone may pull into a starting Residence.',
  },
  {
    kind: 'factory',
    name: 'Factory',
    text: `Draws ${FACTORY_DRAW} cubes from the bag. Every seat in its city scores 1 more point at elections.`,
  },
  {
    kind: 'school',
    name: 'School',
    text: 'Its city’s Residences may pull from other cities. Only one per city when placed.',
  },
]

export const ELECTIONS_INTRO = 'Only the newly merged city votes.'

export const ELECTIONS: TitledText[] = [
  {
    title: 'Seats',
    text: 'Each Residence is a seat, whoever owns it. Grey people don’t vote: the player colour with the most cubes on it wins the seat.',
    note: 'Ties go to the tied player colour furthest left. A seat where nobody votes, empty or all grey, belongs to nobody.',
  },
  {
    title: 'Payout',
    text: 'Each seat scores its holder 1 point per Factory in the city.',
    note: 'Grey and empty seats score for nobody.',
  },
]

export const GAME_END =
  'The game ends after the 4th election, when the last two cities merge, or when everyone passes in a row because nobody’s tiles fit. Most points wins. Tiebreak: most cubes on the board.'
