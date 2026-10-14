import type { SettingsFormProps } from '../platform/types'
import type { RpsSettings } from './types'

const TARGET_SCORE_OPTIONS = [1, 3, 5]

export function RpsSettingsForm({ settings, onChange }: SettingsFormProps<RpsSettings>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">First to</span>
      <div className="flex rounded-lg overflow-hidden border border-neutral-700">
        {TARGET_SCORE_OPTIONS.map(score => (
          <button
            key={score}
            onClick={() => onChange({ ...settings, targetScore: score })}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              settings.targetScore === score
                ? 'bg-neutral-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  )
}
