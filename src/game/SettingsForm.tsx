import type { SettingsFormProps } from 'game-kit/turns'
import { isPlayerCount, MIN_GREY_CUBES } from './rules/setup'
import type { VotesSettings } from './rules/types'

const RESIDENCE_RANGE = { min: 1, max: 30 }
// Below this the 2-player setup can't seed the printed Residences.
const GREY_CUBE_RANGE = { min: MIN_GREY_CUBES, max: 30 }
const STARTING_CUBE_RANGE = { min: 0, max: 10 }

function Stepper({
  label,
  value,
  range,
  onChange,
}: {
  label: string
  value: number
  range: { min: number; max: number }
  onChange: (value: number) => void
}) {
  const buttonClass =
    'h-8 w-8 rounded-lg border border-rule bg-paper font-bold text-ink hover:bg-slot disabled:text-ink-faint disabled:hover:bg-paper'
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={buttonClass} disabled={value <= range.min} onClick={() => onChange(value - 1)} aria-label={`Fewer: ${label}`}>
          −
        </button>
        <span className="w-7 text-center font-semibold tabular-nums">{value}</span>
        <button type="button" className={buttonClass} disabled={value >= range.max} onClick={() => onChange(value + 1)} aria-label={`More: ${label}`}>
          +
        </button>
      </div>
    </div>
  )
}

/** The [bracketed] numbers in the rules draft, adjustable for playtesting. */
export function VotesSettingsForm({ settings, playerCount, onChange }: SettingsFormProps<VotesSettings>) {
  if (!isPlayerCount(playerCount)) throw new Error(`Unsupported player count ${playerCount}`)
  const residences = settings.residencesByPlayerCount[playerCount]

  // Collapsed by default: most games use the rules' values.
  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-sm font-semibold text-ink-soft hover:text-ink">Playtest dials</summary>
      <div className="flex flex-col gap-2 pt-3">
        <Stepper
          label={`Residences each (${playerCount} players)`}
          value={residences}
          range={RESIDENCE_RANGE}
          onChange={value =>
            onChange({ ...settings, residencesByPlayerCount: { ...settings.residencesByPlayerCount, [playerCount]: value } })
          }
        />
        <Stepper
          label="Grey cubes (seeded + bag)"
          value={settings.greyCubes}
          range={GREY_CUBE_RANGE}
          onChange={value => onChange({ ...settings, greyCubes: value })}
        />
        <Stepper
          label="Bag cubes per player"
          value={settings.startingCubesPerPlayer}
          range={STARTING_CUBE_RANGE}
          onChange={value => onChange({ ...settings, startingCubesPerPlayer: value })}
        />
      </div>
    </details>
  )
}
