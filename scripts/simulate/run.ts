import { writeFileSync } from 'node:fs'
import { botPlayer, playGame, sloppyPlayer, type GameRecord } from './playGame'
import { summarize, type Summary } from './summarize'
import { DEFAULT_SETTINGS } from '../../src/game/rules/setup'
import type { VotesSettings } from '../../src/game/rules/types'

// Plays the rules with bots and prints what the games add up to.
//
//   npx vite-node scripts/simulate/run.ts -- [games per player count] [out.json]
//
// To compare dials, add variants to VARIANTS.

interface Variant {
  id: string
  description: string
  settings: VotesSettings
}

const VARIANTS: Variant[] = [{ id: 'current', description: 'The rules as the game plays them, at the default dials.', settings: DEFAULT_SETTINGS }]

const PLAYER_COUNTS = [3, 4, 5]
/** The bot against sloppy players, at 4 players: how much better play is rewarded. */
const SKILL_PLAYER_COUNT = 4

interface VariantResult {
  id: string
  description: string
  summary: Summary
  /** The bot's win share against three sloppy players, its turn position rotating; 0.25 would be no edge. */
  botWinShareVsSloppy: number
}

function playMany(variant: Variant, gamesPerCount: number): GameRecord[] {
  return PLAYER_COUNTS.flatMap(count =>
    Array.from({ length: gamesPerCount }, (_, index) => playGame(variant.settings, count, index + 1, () => botPlayer)),
  )
}

function skillShare(variant: Variant, games: number): number {
  const wins = Array.from({ length: games }, (_, index) =>
    playGame(variant.settings, SKILL_PLAYER_COUNT, 1000 + index, position => (position === index % SKILL_PLAYER_COUNT ? botPlayer : sloppyPlayer)),
  ).filter((record, index) => record.winners.includes(index % SKILL_PLAYER_COUNT))
  return wins.length / games
}

const percent = (share: number) => `${Math.round(share * 100)}%`
const fixed = (value: number, digits = 1) => value.toFixed(digits)

function printTable(results: VariantResult[]): void {
  const header = ['set', 'turns', 'elec', 'lastMerge', 'winPts', 'margin', 'close', 'leadΔ', 'comeback', 'lastElec', 'seatBias', '1stEdge', 'options', 'vsSloppy']
  const rows = results.map(({ id, summary: s, botWinShareVsSloppy }) => [
    id,
    fixed(s.turns, 0),
    fixed(s.elections),
    percent(s.lastMergerShare),
    fixed(s.winnerScore),
    percent(s.relativeMargin),
    percent(s.closeShare),
    fixed(s.leadChanges, 2),
    percent(s.comebackShare),
    percent(s.lastElectionShare),
    fixed(s.seatBias),
    fixed(s.firstPlayerEdge, 2),
    fixed(s.meanActions, 0),
    percent(botWinShareVsSloppy),
  ])
  const usageHeader = ['set', 'R', 'F', 'S', 'passes', 'people', 'bag']
  const usage = results.map(({ id, summary: s }) => [
    id,
    ...(['residence', 'factory', 'school'] as const).map(kind => fixed(s.placed[kind])),
    fixed(s.passes),
    fixed(s.peopleOnBoard),
    fixed(s.bagAtEnd),
  ])
  for (const table of [[header, ...rows], [usageHeader, ...usage]]) {
    const widths = table[0].map((_, column) => Math.max(...table.map(row => row[column].length)))
    console.log(table.map(row => row.map((cell, column) => cell.padStart(widths[column])).join('  ')).join('\n'))
    console.log()
  }
}

function main(): void {
  const [gamesArg, outPath] = process.argv.slice(2).filter(arg => arg !== '--')
  const gamesPerCount = Number(gamesArg ?? 50)
  const results: VariantResult[] = VARIANTS.map(variant => {
    const started = Date.now()
    const result = {
      id: variant.id,
      description: variant.description,
      summary: summarize(playMany(variant, gamesPerCount)),
      botWinShareVsSloppy: skillShare(variant, gamesPerCount),
    }
    console.error(`${variant.id}: ${((Date.now() - started) / 1000).toFixed(1)} s`)
    return result
  })
  printTable(results)
  for (const { id, summary } of results) {
    const shares = Object.entries(summary.winSharesByCount).map(([count, byPosition]) => `${count}p ${byPosition.map(percent).join(' ')}`)
    console.log(`${id.padStart(18)}  wins by turn position: ${shares.join(' | ')}`)
  }
  if (outPath) writeFileSync(outPath, JSON.stringify(results, null, 2))
}

main()
