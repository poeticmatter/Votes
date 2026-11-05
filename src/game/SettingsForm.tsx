import type { SettingsFormProps } from 'game-kit/turns'
import { PLACEABLE_KINDS } from './rules/placement'
import { greyPeopleAtSetup, isPlayerCount } from './rules/setup'
import type { PlaceableKind, VotesSettings } from './rules/types'
import { TILE_NAMES } from './ui/names'

const STARTING_CUBE_RANGE = { min: 0, max: 10 }
const GREY_CUBE_MAX = 20
const TILE_COUNT_RANGE = { min: 1, max: 30 }

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
  // The starting Residences always take their grey cubes; only the rest are a choice.
  const greyRange = { min: greyPeopleAtSetup(playerCount), max: GREY_CUBE_MAX }
  const setTileCount = (kind: PlaceableKind, value: number) =>
    onChange({ ...settings, tileCounts: { ...settings.tileCounts, [kind]: value } })

  // Collapsed by default: most games use the rules' values.
  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-sm font-semibold text-ink-soft hover:text-ink">Playtest dials</summary>
      <div className="flex flex-col gap-2 pt-3">
        <Stepper
          label="Bag cubes per player"
          value={settings.startingCubesPerPlayer}
          range={STARTING_CUBE_RANGE}
          onChange={value => onChange({ ...settings, startingCubesPerPlayer: value })}
        />
        <Stepper
          label="Grey cubes in the game"
          value={Math.max(settings.greyCubes, greyRange.min)}
          range={greyRange}
          onChange={value => onChange({ ...settings, greyCubes: value })}
        />
        {PLACEABLE_KINDS.map(kind => (
          <Stepper
            key={kind}
            label={`${TILE_NAMES[kind]} tiles`}
            value={settings.tileCounts[kind]}
            range={TILE_COUNT_RANGE}
            onChange={value => setTileCount(kind, value)}
          />
        ))}
      </div>
    </details>
  )
}
