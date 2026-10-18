import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ViewerProvider } from '../viewer'
import { RulesSheet } from './RulesSheet'

// The sheet only renders once the Rules dialog opens, so the board tests never draw it.

function renderSheet(lookOf: (seat: number) => number = seat => seat): string {
  return renderToStaticMarkup(
    <ViewerProvider viewer={{ players: [], role: 'spectator', seating: 'remote', lookOf }}>
      <RulesSheet />
    </ViewerProvider>,
  )
}

describe('the rules sheet', () => {
  const markup = renderSheet()

  it('has every section of the rules as text', () => {
    for (const heading of ['Components', 'Setup', 'Towns and cities', 'Your turn', 'Tiles', 'Election, after every merger', 'Game end']) {
      expect(markup).toContain(heading)
    }
  })

  it('draws every worked example', () => {
    expect(markup.match(/Example: /g)).toHaveLength(6)
  })

  it('names the town colours', () => {
    expect(markup).toContain('Sand, Sage and Slate')
  })

  it('names the election’s winner in the figure', () => {
    expect(markup).toContain('Cobalt +4')
  })

  it('keeps the examples’ colours in a disguised hot-seat game', () => {
    // A disguise that turns Cobalt (seat 2) into Saffron must not reach the examples.
    expect(renderSheet(seat => (seat === 2 ? 3 : seat))).toContain('Cobalt +4')
  })
})
