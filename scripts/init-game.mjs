#!/usr/bin/env node
// Turns a fresh copy of the template into a named game.
//
//   npm run init-game -- <repo-name> <game-id> "<Game Title>"
//   npm run init-game -- SpiralDuel spiral "Spiral Duel"
//
// <repo-name> is the GitHub repository name (the GitHub Pages path).
// <game-id> is a short unique id: it names the Supabase table (<game-id>_games) and
// prefixes PeerJS room ids and localStorage keys.

import { readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const TEMPLATE_MIGRATION = 'supabase/migrations/0001_create_template_games.sql'
const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]+$/
const GAME_ID_PATTERN = /^[a-z][a-z0-9_]*$/

function fail(message) {
  console.error(`init-game: ${message}`)
  console.error('Usage: npm run init-game -- <repo-name> <game-id> "<Game Title>"')
  process.exit(1)
}

function rewrite(path, transform) {
  const original = readFileSync(path, 'utf8')
  const updated = transform(original)
  if (updated === original) fail(`${path} did not contain the expected template values. Was init-game already run?`)
  writeFileSync(path, updated)
  console.log(`  updated ${path}`)
}

function renameInPackageJson(path, repoName) {
  rewrite(path, text => {
    const pkg = JSON.parse(text)
    pkg.name = repoName.toLowerCase()
    if (pkg.repository) pkg.repository.url = `https://github.com/poeticmatter/${repoName}`
    if (pkg.packages?.['']) pkg.packages[''].name = pkg.name
    return JSON.stringify(pkg, null, 2) + '\n'
  })
}

const [repoName, gameId, title] = process.argv.slice(2)
if (!repoName || !gameId || !title) fail('missing arguments.')
if (!REPO_NAME_PATTERN.test(repoName)) fail(`"${repoName}" is not a valid GitHub repository name.`)
if (!GAME_ID_PATTERN.test(gameId)) fail(`game id "${gameId}" must be lowercase letters, digits or underscores, starting with a letter.`)
if (!existsSync(TEMPLATE_MIGRATION)) fail(`${TEMPLATE_MIGRATION} not found. Run this from the repository root, once.`)

console.log(`Initialising ${title} (repo ${repoName}, id ${gameId})`)

renameInPackageJson('package.json', repoName)
if (existsSync('package-lock.json')) renameInPackageJson('package-lock.json', repoName)

rewrite('vite.config.ts', text => text.replace("base: '/game-template/'", `base: '/${repoName}/'`))
rewrite('index.html', text => text.replace('<title>Game Template</title>', `<title>${title}</title>`))
rewrite('src/game.config.ts', text =>
  text.replace("id: 'template'", `id: '${gameId}'`).replace("title: 'Game Template'", `title: '${title.replace(/'/g, "\\'")}'`),
)

const migration = join('supabase/migrations', `0001_create_${gameId}_games.sql`)
rewrite(TEMPLATE_MIGRATION, text => text.replaceAll('public.template_games', `public.${gameId}_games`))
renameSync(TEMPLATE_MIGRATION, migration)
console.log(`  renamed migration to ${migration}`)

console.log(`
Done. Next:
  1. Run ${migration} in the shared Supabase project (SQL editor).
  2. Replace src/game/ with your game and update README.md.
  3. Add the game to the hub: poeticmatter/game-lab (games.json).`)
