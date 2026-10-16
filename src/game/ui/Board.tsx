import { Card, type BoardProps } from 'game-kit/turns'
import { activePlayerIndex } from '../rules/turnFlow'
import { RULES_VERSION, type VotesMove, type VotesState } from '../rules/types'
import { MapView } from './map/MapView'
import { ActionPanel } from './panels/ActionPanel'
import { CitiesPanel } from './panels/CitiesPanel'
import { ElectionsPanel } from './panels/ElectionsPanel'
import { LogPanel } from './panels/LogPanel'
import { PlayersPanel } from './panels/PlayersPanel'
import { SupplyPanel } from './panels/SupplyPanel'
import { TurnBanner } from './panels/TurnBanner'
import { RulesButton } from './rulesSheet/RulesButton'
import { useMediaQuery, WIDE_LAYOUT_QUERY } from './useMediaQuery'
import { useTurnControls } from './useTurnControls'
import { ViewerProvider } from './viewer'

type VotesBoardProps = BoardProps<VotesState, VotesMove>

/** A game saved by another version can't be read by this one, so it says so instead of crashing. */
function OtherVersionGame() {
  return (
    <div className="mx-auto max-w-lg p-4">
      <Card className="flex flex-col gap-2 text-center">
        <p className="font-bold">This game was started with a different version of Votes.</p>
        <p className="text-sm text-ink-soft">
          The rules have changed since, so it can’t be loaded. Reload the page to get the latest version, then start a
          new game.
        </p>
        <a href="./" className="text-sm underline">
          Back to the lobby
        </a>
      </Card>
    </div>
  )
}

export function VotesBoard(props: VotesBoardProps) {
  // Games from before the version existed have none, which also doesn't match.
  if (props.state.rulesVersion !== RULES_VERSION) return <OtherVersionGame />
  return <CurrentVersionBoard {...props} />
}

function CurrentVersionBoard({ state, role, players, onMove, seating, lookOf }: VotesBoardProps) {
  const isViewersTurn = role === activePlayerIndex(state)
  const controls = useTurnControls(state, isViewersTurn, onMove)
  const isWide = useMediaQuery(WIDE_LAYOUT_QUERY)
  const isOver = state.phase.kind === 'gameOver'
  // Narrow screens stack everything, so the choices go above the map, not below it.
  const actionPanel = !isOver && <ActionPanel state={state} canAct={isViewersTurn} controls={controls} onMove={onMove} />

  return (
    <ViewerProvider viewer={{ players, role, seating, lookOf }}>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 p-3 lg:flex-row lg:items-start lg:gap-4 lg:p-4">
        <main className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:flex-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <TurnBanner state={state} isViewersTurn={isViewersTurn} seating={seating} />
            </div>
            <RulesButton />
          </div>
          {!isWide && actionPanel}
          <div className="mx-auto w-full max-w-[calc((100svh-1.5rem)*1.03)] lg:max-w-[calc((100vh-7rem)*1.03)]">
            <MapView
              state={state}
              targets={controls.targets}
              describeTarget={controls.describeTarget}
              onTarget={controls.onTarget}
              preview={controls.preview}
              emphasized={controls.emphasized}
            />
          </div>
        </main>
        <aside className="flex flex-col gap-3 lg:w-[380px] lg:shrink-0">
          {isWide && actionPanel}
          <PlayersPanel state={state} players={players} />
          <SupplyPanel state={state} />
          {!isOver && <CitiesPanel state={state} />}
          <ElectionsPanel state={state} />
          <LogPanel state={state} />
          {role === 'spectator' && seating === 'remote' && <p className="text-center text-sm text-ink-soft">You’re watching.</p>}
        </aside>
      </div>
    </ViewerProvider>
  )
}
