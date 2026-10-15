import type { ReactNode } from 'react'
import { Card } from '../../../platform/controls'

export function Panel({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      {title && <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{title}</h3>}
      {children}
    </Card>
  )
}
