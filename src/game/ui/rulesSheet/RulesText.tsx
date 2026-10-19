import type { ReactNode } from 'react'
import { TileIcon } from '../names'
import { MetroSteps, SectionHeading, type MetroStep } from './MetroSteps'
import {
  BUILDINGS,
  CITIES,
  COMPONENTS,
  CORE_CONCEPTS,
  ELECTIONS,
  ELECTIONS_INTRO,
  GAME_END,
  MERGER_STEP_TITLE,
  SETUP,
  TURN,
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

function Buildings() {
  return (
    <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
      {BUILDINGS.map(building => (
        <div key={building.name} className="flex items-start gap-2.5">
          <TileIcon tile={building.tile} width={TILE_ICON_WIDTH} />
          <div>
            <span className="font-bold">{building.name}</span>
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
      <Section title="Cities">
        <p>{CITIES}</p>
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
