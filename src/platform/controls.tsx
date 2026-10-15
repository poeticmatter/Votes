import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Small shared controls in the Metro look, used by the platform's screens and by
// games' settings forms.

type ButtonTone = 'primary' | 'secondary'

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-soft disabled:bg-rule disabled:text-ink-faint',
  secondary: 'bg-paper text-ink border border-rule hover:bg-slot disabled:text-ink-faint disabled:hover:bg-paper',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
}

export function Button({ tone = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:cursor-not-allowed ${BUTTON_TONES[tone]} ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-rule bg-paper p-4 ${className}`}>{children}</div>
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">{children}</span>
}

interface SegmentedControlProps<Value extends string | number> {
  options: readonly Value[]
  value: Value
  onChange: (value: Value) => void
  labelOf?: (value: Value) => string
}

export function SegmentedControl<Value extends string | number>({
  options,
  value,
  onChange,
  labelOf = String,
}: SegmentedControlProps<Value>) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-rule">
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            value === option ? 'bg-ink text-paper' : 'bg-paper text-ink-soft hover:bg-slot'
          }`}
        >
          {labelOf(option)}
        </button>
      ))}
    </div>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
    />
  )
}

export function ColorSwatch({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-[3px] border border-black/40"
      style={{ backgroundColor: color, width: size, height: size }}
    />
  )
}
