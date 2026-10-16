import type { ReactNode } from 'react'

// Text laid out like a transit line: numbered stops joined by a heavy line. Ported from
// the asset generator's src/metro/MetroSteps.jsx, so the in-game rules read like the
// printed sheet.

export interface MetroStep {
  title: string
  body: ReactNode
  /** Drawn as an interchange ring, like a merger marker. */
  isInterchange?: boolean
}

function Stop({ label, isInterchange }: { label: number; isInterchange: boolean }) {
  const look = isInterchange ? 'border-[4px] border-ink bg-paper text-ink' : 'bg-ink text-paper'
  return (
    <div className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${look}`}>
      {label}
    </div>
  )
}

/** Each stop's line runs down to the next stop, whatever the text's height. */
export function MetroSteps({ steps }: { steps: MetroStep[] }) {
  return (
    <ol>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        return (
          <li key={step.title} className="flex gap-3">
            <div className="flex w-[26px] shrink-0 flex-col items-center">
              <Stop label={index + 1} isInterchange={step.isInterchange ?? false} />
              {!isLast && <div className="w-1 flex-1 bg-ink" />}
            </div>
            <div className={`flex-1 pt-0.5 ${isLast ? '' : 'pb-2'}`}>
              <span className="font-bold">{step.title}. </span>
              {step.body}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-[13px] font-bold uppercase tracking-[0.18em] text-ink">{children}</h3>
}
