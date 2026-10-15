import { useSyncExternalStore } from 'react'

/** Tailwind's `lg` breakpoint, where the side panel moves beside the map. */
export const WIDE_LAYOUT_QUERY = '(min-width: 64rem)'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    // No window when rendering outside a browser (tests): assume the narrow layout.
    () => false,
  )
}
