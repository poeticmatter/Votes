import { Button } from 'game-kit/turns'
import { districtOf } from '../../map/board'
import type { HexKey } from '../../map/hexGrid'
import { peopleAt } from '../../rules/boardQueries'
import { housingPayee } from '../../rules/housing'
import { RESIDENCE_CAPACITY, type VotesState } from '../../rules/types'
import { countOf, CubeChip, useColorNameOf, useIsViewer, useNameOf, useOwnerOf } from '../names'
import type { PersonPicker } from '../useTurnControls'
import { useByLook } from '../viewer'

// Moving one person, for a School's relocation or for housing: the active player picks
// where from (on the map, or from a list of Stations when housing), which colour when
// there's a choice, then where to. The map highlights the same choices.

function relocationIntro(owed: number): string {
  return `Your School moves 1 person from anywhere on the board into each Residence next to it, even a full one: ${countOf(owed, 'Residence')} to go (outlined). Choose a Residence or Station on the map to take someone from.`
}

const HOUSING_INTRO =
  'People waiting at Stations move into Residences with space in their city, as many as fit. Choose who moves in next.'

/** "Ana’s Station in E", "Printed Residence D", "Your Residence in B". */
function useDescribeTile(state: VotesState): (key: HexKey) => string {
  const ownerOf = useOwnerOf()
  return key => {
    const tile = state.tiles[key]
    if (tile?.kind === 'station') return `${ownerOf(tile.owner)} Station in ${districtOf(key)}`
    if (tile?.kind !== 'residence') return key
    if (!tile.owner) return `Printed Residence ${districtOf(key)}`
    return `${ownerOf(tile.owner)} Residence in ${districtOf(key)}`
  }
}

/** A Residence the chosen person may move into, with who earns a cube for it when housing. */
function useDescribeDestination(state: VotesState, picker: PersonPicker): (key: HexKey) => string {
  const describeTile = useDescribeTile(state)
  const nameOf = useNameOf()
  const isViewer = useIsViewer()
  return to => {
    const people = `${peopleAt(state, to).length}/${RESIDENCE_CAPACITY}`
    const isHousing = state.phase.kind === 'housing'
    const payee = isHousing && picker.from && picker.color ? housingPayee(state, { from: picker.from, color: picker.color, to }) : null
    if (!payee) return `${describeTile(to)} · ${people}`
    const earner = isViewer(payee) ? 'you earn' : `${nameOf(payee)} earns`
    return `${describeTile(to)} · ${people} · ${earner} a cube`
  }
}

function ChoiceList({ keys, describe, onChoose }: { keys: HexKey[]; describe: (key: HexKey) => string; onChoose: (key: HexKey) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {keys.map(key => (
        <Button key={key} tone="secondary" onClick={() => onChoose(key)} className="px-3 py-2 text-left text-sm">
          {describe(key)}
        </Button>
      ))}
    </div>
  )
}

function ColorChoices({ picker }: { picker: PersonPicker }) {
  const byLook = useByLook()
  const colorNameOf = useColorNameOf()
  return (
    <div className="flex flex-wrap gap-2">
      {byLook(picker.colorsAtFrom).map(color => (
        <Button key={color} tone="secondary" onClick={() => picker.chooseColor(color)} className="flex items-center gap-2 px-3 py-2 text-sm">
          <CubeChip color={color} size={18} /> {colorNameOf(color)}
        </Button>
      ))}
    </div>
  )
}

/** Picks one person to move: where from, which colour if there's a choice, then where to. */
export function PersonChoices({ state, picker }: { state: VotesState; picker: PersonPicker }) {
  const intro = state.phase.kind === 'relocation' ? relocationIntro(state.phase.residences.length) : HOUSING_INTRO
  const describeTile = useDescribeTile(state)
  const describeDestination = useDescribeDestination(state, picker)
  const colorNameOf = useColorNameOf()

  if (!picker.from) {
    const sources = [...new Set(picker.moves.map(move => move.from))]
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">{intro}</p>
        {state.phase.kind === 'housing' && <ChoiceList keys={sources} describe={describeTile} onChoose={picker.chooseFrom} />}
      </div>
    )
  }

  const back = (
    <Button tone="secondary" onClick={picker.reset}>
      Back
    </Button>
  )
  if (!picker.color) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">Who moves from {describeTile(picker.from)}?</p>
        <ColorChoices picker={picker} />
        {back}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm">
        <CubeChip color={picker.color} size={18} />
        <span>
          Where does the <strong>{colorNameOf(picker.color)}</strong> person from {describeTile(picker.from)} go?
        </span>
      </p>
      <ChoiceList keys={picker.destinations} describe={describeDestination} onChoose={picker.chooseDestination} />
      {back}
    </div>
  )
}
