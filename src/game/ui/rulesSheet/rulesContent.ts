import { BOARD, isStationSiteInUse } from '../../map/board'
import { DEFAULT_SETTINGS } from '../../rules/setup'
import { STATIONS_BY_PLAYER_COUNT, type PlayerCount, type Tile } from '../../rules/types'

// The one-page rules, ported from the asset generator's src/rules/rulesContent.js
// (itself Rules/Votes.md, condensed). When the sheet there changes, bring this in line.
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

/** One paragraph per entry. */
export const LEDE = [
  'Whoever controls the factories controls the economy. Use zoning laws to control the population and get elected mayor of the forming cities.',
  'Votes (temp name) is a 2–5 player game of shared development and vote manipulation.',
]

export const COMPONENTS: LeadText[] = [
  {
    lead: 'Board',
    text: 'The map, a score track and slots for 4 merger markers. The map has 5 printed Residences, 2 printed Factories, station sites, rails and a river along hex edges, and lakes, mountains and forests that can’t be built on.',
  },
  { lead: 'Public tiles', text: 'Factories and Schools, in a shared supply.' },
  { lead: 'Private tiles', text: 'In your colour: Stations and Residences, by player count (below).' },
  { lead: 'Pieces', text: 'Cubes (people) in each player’s colour, 10 grey cubes (independents), a bag, 4 merger markers and a +50 token.' },
]

export interface PlayerCountColumn {
  players: PlayerCount
  stations: number
  sites: number
  residences: number
}

const PLAYER_COUNTS_IN_ORDER: PlayerCount[] = [2, 3, 4, 5]

/** Taken from the game's own numbers, so the table can't disagree with play. */
export const PLAYER_COUNTS: PlayerCountColumn[] = PLAYER_COUNTS_IN_ORDER.map(players => ({
  players,
  stations: STATIONS_BY_PLAYER_COUNT[players],
  sites: BOARD.hexes.filter(hex => isStationSiteInUse(hex, players)).length,
  residences: DEFAULT_SETTINGS.residencesByPlayerCount[players],
}))

export const SETUP = [
  'Give each player their Stations and Residences.',
  'Take 2 cubes of each player’s colour, then add grey cubes until there are 10. Mix them and place 2 at random on each printed Residence.',
  'Put the remaining grey cubes and 2 more cubes of each player’s colour in the bag.',
  'Each player puts one cube of their colour on 0 of the score track. Put the merger markers on their slots and choose a first player.',
]

export const DISTRICTS_AND_CITIES =
  'A district is an area of the map bounded by rails, the river, lakes, mountains and forests; the letter on its printed Residence names it. A city is one or more districts that have merged. At the start, each district is its own city.'

export const CORE_CONCEPTS: { intro: string; items: LeadText[] } = {
  intro: 'Cubes are people. Every tile you place brings people in or moves them around, in one of three ways:',
  items: [
    { lead: 'Relocation', text: 'Move people already on the board, as the tile says. Nobody earns cubes for relocation.' },
    {
      lead: 'Immigration',
      text: 'People arrive by train and wait on a Station: draw them from the bag and place them on it. The Station’s owner earns 1 cube per person, adding that many of their own cubes to the bag.',
    },
    {
      lead: 'Housing',
      text: 'Move people waiting at Stations into Residences with space in the same city, as many as fit. The Residence’s owner earns 1 cube for each person housed from another player’s Station. A Residence with 3 or more people is full.',
    },
  ],
}

/** The merger step is drawn as an interchange, like the merger markers. */
export const MERGER_STEP_TITLE = 'Merger'

export const TURN: TitledText[] = [
  {
    title: 'Place a tile',
    text: 'Public from the supply or private from your stock, on an empty hex next to a tile in the same district.',
  },
  { title: 'Relocation', text: 'If the tile has one.' },
  { title: 'Immigration', text: 'If the tile has one.' },
  { title: 'Housing', text: 'Relocation may have freed space, so people can cascade into it.' },
  {
    title: MERGER_STEP_TITLE,
    text: 'If the tile touches a tile across a district line that belongs to a different city, those cities become one. Put the next merger marker on that line and hold an election.',
  },
]

export interface BuildingEntry {
  tile: Tile
  name: string
  owner: 'Yours' | 'Public'
  text: string
}

export const BUILDINGS: BuildingEntry[] = [
  {
    tile: { kind: 'station', owner: 'blue', people: [] },
    name: 'Station',
    owner: 'Yours',
    text: 'Only on a station site, and nothing else goes there. Sites marked 4+ or 5 are used only at those player counts; otherwise they’re normal hexes. Immigration: 2 people at this Station.',
  },
  {
    tile: { kind: 'residence', owner: 'vermillion', people: [] },
    name: 'Residence',
    owner: 'Yours',
    text: 'Holds 3 people and is 1 seat. Printed Residences belong to nobody.',
  },
  {
    tile: { kind: 'factory' },
    name: 'Factory',
    owner: 'Public',
    text: 'Immigration: 2 people at each Station in its district. At elections, worth 1 point, or 2 if it borders a rail.',
  },
  {
    tile: { kind: 'school' },
    name: 'School',
    owner: 'Public',
    text: 'Relocation: move 1 person from anywhere on the board into each adjacent Residence, even a full one.',
  },
]

export const ELECTIONS_INTRO = 'Only the newly merged city votes.'

export const ELECTIONS: TitledText[] = [
  {
    title: 'Seats',
    text: 'Each Residence is a seat. The colour with the most cubes on it wins the seat.',
    note: 'Ties go to the Residence’s owner, so an empty one is its owner’s. Ties on a printed Residence go to grey.',
  },
  {
    title: 'Payout',
    text: 'The player with the most seats in the city scores its Factories: 1 point each, or 2 for one bordering a rail. Tied players each score. If grey has the most, nobody scores.',
    note: 'Past 49 on the score track, take the +50 token.',
  },
]

export const GAME_END =
  'The game ends after the 4th election, when the last two cities merge and the last merger marker leaves its slot. Most points wins. Tiebreak: most cubes on the board.'
