import type { SettingsFormProps } from 'game-kit/turns'
import { PLACEABLE_KINDS } from './rules/placement'
import { isPlayerCount, smallestBag } from './rules/setup'
import type { PlaceableKind, VotesSettings } from './rules/types'
import { TILE_NAMES } from './ui/names'

const BAG_CUBES_PER_PLAYER_RANGE = { min: 0, max: 10 }
const BAG_SIZE_MAX = 40
const TILE_COUNT_RANGE = { min: 0, max: 20 }

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

/** The [bracketed] numbers in the rules, adjustable for playtesting. Collapsed by default: most games use the rules' values. */
export function VotesSettingsForm({ settings, playerCount, onChange }: SettingsFormProps<VotesSettings>) {
  if (!isPlayerCount(playerCount)) throw new Error(`Unsupported player count ${playerCount}`)
  // The bag holds every player's cubes; grey only tops it up.
  const bagRange = { min: smallestBag(settings, playerCount), max: BAG_SIZE_MAX }
  const setTileCount = (kind: PlaceableKind, value: number) =>
    onChange({ ...settings, tilesPerPlayer: { ...settings.tilesPerPlayer, [kind]: value } })

  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-sm font-semibold text-ink-soft hover:text-ink">Playtest dials</summary>
      <div className="flex flex-col gap-2 pt-3">
        <Stepper
          label="Bag cubes per player"
          value={settings.bagCubesPerPlayer}
          range={BAG_CUBES_PER_PLAYER_RANGE}
          onChange={value => onChange({ ...settings, bagCubesPerPlayer: value, bagSize: Math.max(settings.bagSize, value * playerCount) })}
        />
        <Stepper
          label="Cubes in the bag (grey fills the rest)"
          value={Math.max(settings.bagSize, bagRange.min)}
          range={bagRange}
          onChange={value => onChange({ ...settings, bagSize: value })}
        />
        {PLACEABLE_KINDS.map(kind => (
          <Stepper
            key={kind}
            label={`${TILE_NAMES[kind]} tiles each`}
            value={settings.tilesPerPlayer[kind]}
            range={TILE_COUNT_RANGE}
            onChange={value => setTileCount(kind, value)}
          />
        ))}
      </div>
    </details>
  )
}
