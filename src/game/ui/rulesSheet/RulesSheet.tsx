import { useViewer, ViewerProvider } from '../viewer'
import { LEDE } from './rulesContent'
import { RulesExamples } from './RulesExamples'
import { RulesText } from './RulesText'

// The complete rules on one page, as on the asset generator's rules sheet
// (src/rules/RulesSheet.jsx): rules on the left, worked examples on the right, one
// column on a narrow screen. Everything is real text, so the browser can search it.

const SAME_LOOK = (seat: number) => seat

function Header() {
  return (
    <header className="mb-6">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 border-b-8 border-ink pb-2.5">
        <h2 className="text-5xl font-extrabold leading-none tracking-[0.15em] sm:text-6xl">VOTES</h2>
        <span className="text-base font-bold tracking-[0.2em] text-ink-faint">RULES · 2–5 PLAYERS</span>
      </div>
      {LEDE.map(paragraph => (
        <p key={paragraph} className="mt-2 max-w-[900px] text-lg leading-snug first:mt-0">
          {paragraph}
        </p>
      ))}
    </header>
  )
}

export function RulesSheet() {
  // The examples are illustrations in fixed colours that their captions name, so they
  // skip the hot-seat disguise every player colour on the board goes through.
  const viewer = useViewer()
  return (
    <ViewerProvider viewer={{ ...viewer, lookOf: SAME_LOOK }}>
      <article className="text-[14.5px] leading-[1.42] text-ink">
        <Header />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
          <RulesText />
          <RulesExamples />
        </div>
      </article>
    </ViewerProvider>
  )
}
