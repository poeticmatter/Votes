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
    for (const heading of ['Components', 'Setup', 'Cities', 'Your turn', 'Tiles', 'Election, after every merger', 'Game end']) {
      expect(markup).toContain(heading)
    }
  })

  it('draws every worked example', () => {
    expect(markup.match(/Example: /g)).toHaveLength(7)
  })

  it('explains that each seat scores per face-up Factory', () => {
    expect(markup).toContain('1 point per face-up Factory')
  })

  it('names what each player scores in the election figure', () => {
    expect(markup).toContain('Cobalt +4, Saffron +2')
  })

  it('keeps the examples’ colours in a disguised solo playtest', () => {
    // A disguise that turns Cobalt (seat 2) into Saffron must not reach the examples.
    expect(renderSheet(seat => (seat === 2 ? 3 : seat))).toContain('Cobalt +4')
  })
})
