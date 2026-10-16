import type { ReactNode } from 'react'
import { TileIcon } from '../names'
import { MetroSteps, SectionHeading, type MetroStep } from './MetroSteps'
import {
  BUILDINGS,
  COMPONENTS,
  CORE_CONCEPTS,
  DISTRICTS_AND_CITIES,
  ELECTIONS,
  ELECTIONS_INTRO,
  GAME_END,
  MERGER_STEP_TITLE,
  PLAYER_COUNTS,
  SETUP,
  TURN,
  type PlayerCountColumn,
} from './rulesContent'

// The rules column of the rules sheet, ported from the asset generator's
// src/rules/RulesText.jsx.

const TILE_ICON_WIDTH = 40

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  )
}

const PLAYER_COUNT_ROWS: { label: string; field: keyof Omit<PlayerCountColumn, 'players'> }[] = [
  { label: 'Stations each', field: 'stations' },
  { label: 'Station sites in use', field: 'sites' },
  { label: 'Residences each', field: 'residences' },
]

function PlayerCountTable() {
  return (
    <table className="mt-1.5 border-collapse text-[13.5px]">
      <thead>
        <tr>
          <th className="border-b border-rule py-0.5 pr-2.5 text-left font-semibold text-ink-soft">Players</th>
          {PLAYER_COUNTS.map(({ players }) => (
            <th key={players} className="border-b border-rule px-2.5 py-0.5 text-center font-bold">
              {players}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PLAYER_COUNT_ROWS.map(({ label, field }) => (
          <tr key={field}>
            <th scope="row" className="py-0.5 pr-2.5 text-left font-semibold text-ink-soft">
              {label}
            </th>
            {PLAYER_COUNTS.map(count => (
              <td key={count.players} className="px-2.5 py-0.5 text-center tabular-nums">
                {count[field]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Buildings() {
  return (
    <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
      {BUILDINGS.map(building => (
        <div key={building.name} className="flex items-start gap-2.5">
          <TileIcon tile={building.tile} width={TILE_ICON_WIDTH} />
          <div>
            <span className="font-bold">{building.name}</span>{' '}
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">{building.owner}</span>
            <div>{building.text}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const turnSteps: MetroStep[] = TURN.map(step => ({
  title: step.title,
  body: step.text,
  isInterchange: step.title === MERGER_STEP_TITLE,
}))

const electionSteps: MetroStep[] = ELECTIONS.map(step => ({
  title: step.title,
  body: (
    <>
      {step.text}
      {step.note && <div className="mt-0.5 text-ink-soft">{step.note}</div>}
    </>
  ),
}))

export function RulesText() {
  return (
    <div>
      <Section title="Components">
        {COMPONENTS.map(component => (
          <p key={component.lead} className="mb-0.5">
            <span className="font-bold">{component.lead}:</span> {component.text}
          </p>
        ))}
        <PlayerCountTable />
      </Section>
      <Section title="Setup">
        <ol className="list-decimal pl-5">
          {SETUP.map(step => (
            <li key={step} className="mb-0.5">
              {step}
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Districts and cities">
        <p>{DISTRICTS_AND_CITIES}</p>
      </Section>
      <Section title="Core concepts">
        <p>{CORE_CONCEPTS.intro}</p>
        {CORE_CONCEPTS.items.map(item => (
          <p key={item.lead} className="mt-1">
            <span className="font-bold">{item.lead}:</span> {item.text}
          </p>
        ))}
      </Section>
      <Section title="Your turn">
        <MetroSteps steps={turnSteps} />
      </Section>
      <Section title="Tiles">
        <Buildings />
      </Section>
      <Section title="Election, after every merger">
        <p className="mb-2">{ELECTIONS_INTRO}</p>
        <MetroSteps steps={electionSteps} />
      </Section>
      <Section title="Game end">
        <p>{GAME_END}</p>
      </Section>
    </div>
  )
}
