import type { ReactNode } from 'react'
import { ElectionFigure } from './ElectionFigure'
import { HousingFigure, ImmigrationFigure, MergerFigure, PlacementFigure, SchoolFigure } from './ExampleFigures'
import { ELECTION_EXAMPLE, HOUSING_EXAMPLE, IMMIGRATION_EXAMPLE, MERGER_EXAMPLE, PLACEMENT_EXAMPLE, SCHOOL_EXAMPLE } from './examples'
import { SectionHeading } from './MetroSteps'

// The examples column of the rules sheet: a figure beside its caption, or above it on a
// narrow screen. Ported from the asset generator's src/rules/RulesExamples.jsx.

function Example({ title, figure, children }: { title: string; figure: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      <SectionHeading>{title}</SectionHeading>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="w-full max-w-[300px] shrink-0">{figure}</div>
        <div className="grid gap-1.5 text-[13.5px] leading-snug">{children}</div>
      </div>
    </section>
  )
}

const CaptionLines = ({ lines }: { lines: string[] }) => (
  <>
    {lines.map(line => (
      <p key={line}>{line}</p>
    ))}
  </>
)

/** The same badge as on the figure, inline in the caption. */
function BadgeChip({ number, isAllowed }: { number: number; isAllowed: boolean }) {
  const look = isAllowed ? 'bg-paper text-ink' : 'bg-ink text-paper'
  return (
    <span
      className={`mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border-[2.5px] border-ink align-[-4px] text-xs font-extrabold ${look}`}
    >
      {number}
    </span>
  )
}

export function RulesExamples() {
  return (
    <div>
      <Example title="Example: placing a tile" figure={<PlacementFigure />}>
        <p>{PLACEMENT_EXAMPLE.intro}</p>
        {PLACEMENT_EXAMPLE.candidates.map(candidate => (
          <p key={candidate.number}>
            <BadgeChip number={candidate.number} isAllowed={candidate.isAllowed} />
            <span className="font-bold">{candidate.isAllowed ? 'Allowed.' : 'Not allowed.'}</span> {candidate.reason}
          </p>
        ))}
      </Example>
      <Example title="Example: immigration" figure={<ImmigrationFigure />}>
        <CaptionLines lines={IMMIGRATION_EXAMPLE.caption} />
      </Example>
      <Example title="Example: housing" figure={<HousingFigure />}>
        <CaptionLines lines={HOUSING_EXAMPLE.caption} />
      </Example>
      <Example title="Example: a School, then housing" figure={<SchoolFigure />}>
        <CaptionLines lines={SCHOOL_EXAMPLE.caption} />
      </Example>
      <Example title="Example: a merger" figure={<MergerFigure />}>
        <CaptionLines lines={MERGER_EXAMPLE.caption} />
      </Example>
      <Example title="Example: an election" figure={<ElectionFigure />}>
        <CaptionLines lines={ELECTION_EXAMPLE.caption} />
      </Example>
    </div>
  )
}
