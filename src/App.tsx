import { useCallback, useState } from 'react'
import { game, type GamePlan, type GameSettings, type GameState } from './game'
import { Lobby } from './platform/Lobby'
import { buildRoomUrl, generateRoomCode, readRoomLinkFromUrl, recallRole, rememberRoomCreator, type RoomLink } from './platform/roomLink'
import { HandoffScreen, ProgressScreen, StatusScreen, WaitingForPartnerScreen } from './platform/StatusScreens'
import type { MatchConnection, PlayMode, Seating } from './platform/types'
import { useAsyncMatch } from './platform/useAsyncMatch'
import { useHotSeatMatch } from './platform/useHotSeatMatch'
import { usePeerGuest } from './platform/usePeerGuest'
import { usePeerHost } from './platform/usePeerHost'

type Connection = MatchConnection<GameState, GamePlan>

function GameBoard({ state, connection, seating }: { state: GameState; connection: Connection; seating: Seating }) {
  return (
    <game.Board
      state={state}
      role={connection.role}
      hasCommitted={connection.hasCommitted}
      onSubmitPlan={connection.submitPlan}
      seating={seating}
    />
  )
}

/** Maps any transport's connection to the right screen, ending at the game's Board. */
function MatchScreen({ room, connection }: { room: RoomLink; connection: Connection }) {
  const { state, status, errorMessage } = connection

  if (status === 'error') return <StatusScreen message={errorMessage ?? 'Connection error.'} />
  if (status === 'disconnected') return <StatusScreen message="Lost connection to the host." />
  if (status === 'reconnecting') return <ProgressScreen title="Connection lost" detail="Reconnecting…" />
  if (status === 'waiting_for_partner') return <WaitingForPartnerScreen room={room} />
  if (!state) return <ProgressScreen title="Connecting…" />

  return <GameBoard state={state} connection={connection} seating="remote" />
}

function LiveHostMatch({ room, settings }: { room: RoomLink; settings: GameSettings }) {
  return <MatchScreen room={room} connection={usePeerHost(room.code, game.rules, settings)} />
}

function LiveGuestMatch({ room }: { room: RoomLink }) {
  return <MatchScreen room={room} connection={usePeerGuest<GameState, GamePlan>(room.code)} />
}

function AsyncMatch({ room, settings }: { room: RoomLink; settings: GameSettings | null }) {
  const slot = recallRole(room.code) === 1 ? 1 : 2
  return <MatchScreen room={room} connection={useAsyncMatch(room.code, slot, game.rules, settings)} />
}

function HotSeatMatch({ settings }: { settings: GameSettings }) {
  const { connection, pendingHandoff, confirmHandoff } = useHotSeatMatch(game.rules, settings)
  if (pendingHandoff !== null) return <HandoffScreen slot={pendingHandoff} onReady={confirmHandoff} />
  if (!connection.state) return <ProgressScreen title="Starting…" />

  // Remount per player so one player's in-progress UI selection never shows to the other.
  return (
    <GameBoard
      key={`${connection.state.turn}-${connection.role}`}
      state={connection.state}
      connection={connection}
      seating="hot_seat"
    />
  )
}

interface ActiveRoom {
  link: RoomLink
  /** Present only in the tab that created the room. */
  settings: GameSettings | null
}

export default function App() {
  const [room, setRoom] = useState<ActiveRoom | null>(() => {
    const link = readRoomLinkFromUrl()
    return link ? { link, settings: null } : null
  })

  // Hot-seat matches live only in memory: they have no room and no URL to share or resume.
  const [hotSeatSettings, setHotSeatSettings] = useState<GameSettings | null>(null)

  const createMatch = useCallback((settings: GameSettings, mode: PlayMode) => {
    if (mode === 'hot_seat') {
      setHotSeatSettings(settings)
      return
    }
    const link: RoomLink = { code: generateRoomCode(), transport: mode }
    rememberRoomCreator(link.code)
    history.replaceState(null, '', buildRoomUrl(link))
    setRoom({ link, settings })
  }, [])

  if (hotSeatSettings) return <HotSeatMatch settings={hotSeatSettings} />

  if (!room) {
    return <Lobby defaultSettings={game.defaultSettings} SettingsForm={game.SettingsForm} onCreateMatch={createMatch} />
  }

  if (room.link.transport === 'async') return <AsyncMatch room={room.link} settings={room.settings} />
  if (room.settings) return <LiveHostMatch room={room.link} settings={room.settings} />
  return <LiveGuestMatch room={room.link} />
}
