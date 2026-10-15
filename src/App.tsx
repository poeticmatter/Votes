import { useCallback, useState } from 'react'
import { game, type GameMove, type GameSettings, type GameState } from './game'
import { Lobby, type MatchRequest } from './platform/Lobby'
import {
  buildRoomUrl,
  generateRoomCode,
  generateSeed,
  readRoomLinkFromUrl,
  rememberPlayerName,
  rememberRole,
  type RoomLink,
} from './platform/roomLink'
import { JoinScreen, ProgressScreen, StatusScreen, WaitingForPlayersScreen } from './platform/StatusScreens'
import type { MatchConnection, MatchSetup, NewMatch } from './platform/types'
import { useAsyncMatch } from './platform/useAsyncMatch'
import { useHotSeatMatch } from './platform/useHotSeatMatch'
import { usePeerGuest } from './platform/usePeerGuest'
import { usePeerHost } from './platform/usePeerHost'
import { useTurnTitle } from './platform/useTurnTitle'

type Connection = MatchConnection<GameState, GameMove>
type GameNewMatch = NewMatch<GameSettings, GameState>

function isMyTurn({ state, role, status }: Connection): boolean {
  return status === 'playing' && state !== null && role === game.rules.activePlayer(state)
}

/** Maps any online transport's connection to the right screen, ending at the game's Board. */
function MatchScreen({ room, connection }: { room: RoomLink; connection: Connection }) {
  const { state, status, errorMessage, players, playerCount, seatChoice } = connection
  useTurnTitle(isMyTurn(connection))

  if (status === 'error') return <StatusScreen message={errorMessage ?? 'Connection error.'} />
  if (status === 'disconnected') return <StatusScreen message="Lost connection to the host." />
  if (status === 'reconnecting') return <ProgressScreen title="Connection lost" detail="Reconnecting…" />
  if (!state || playerCount === null) return <ProgressScreen title="Connecting…" />

  const seats = { players, playerCount, appearanceOf: game.playerAppearance }
  if (seatChoice) return <JoinScreen {...seats} seatChoice={seatChoice} />
  if (status === 'waiting_for_players') return <WaitingForPlayersScreen room={room} {...seats} />

  return <game.Board state={state} role={connection.role} players={players} onMove={connection.submitMove} seating="remote" />
}

function LiveHostMatch({ room, newMatch }: { room: RoomLink; newMatch: GameNewMatch }) {
  return <MatchScreen room={room} connection={usePeerHost(room.code, game.rules, newMatch)} />
}

function LiveGuestMatch({ room }: { room: RoomLink }) {
  return <MatchScreen room={room} connection={usePeerGuest<GameState, GameMove>(room.code)} />
}

function AsyncMatch({ room, newMatch }: { room: RoomLink; newMatch: GameNewMatch | null }) {
  return <MatchScreen room={room} connection={useAsyncMatch(room.code, game.rules, newMatch)} />
}

function HotSeatMatch({ setup }: { setup: MatchSetup<GameSettings> }) {
  const connection = useHotSeatMatch(game.rules, setup)
  if (!connection.state) return <ProgressScreen title="Starting…" />
  return (
    <game.Board
      state={connection.state}
      role={connection.role}
      players={connection.players}
      onMove={connection.submitMove}
      seating="hot_seat"
    />
  )
}

interface ActiveRoom {
  link: RoomLink
  /** Present only in the tab that created the room. */
  newMatch: GameNewMatch | null
}

export default function App() {
  const [room, setRoom] = useState<ActiveRoom | null>(() => {
    const link = readRoomLinkFromUrl()
    return link ? { link, newMatch: null } : null
  })

  // Hot-seat matches live only in memory: they have no room and no URL to share or resume.
  const [hotSeatSetup, setHotSeatSetup] = useState<MatchSetup<GameSettings> | null>(null)

  const createMatch = useCallback(({ settings, playerCount, mode, hostName }: MatchRequest<GameSettings>) => {
    const setup: MatchSetup<GameSettings> = { settings, playerCount, seed: generateSeed() }
    // The Create button sits at the bottom of the lobby; start the board at the top.
    window.scrollTo(0, 0)
    if (mode === 'hot_seat') {
      setHotSeatSetup(setup)
      return
    }
    const link: RoomLink = { code: generateRoomCode(), transport: mode }
    rememberRole(link.code, 0)
    rememberPlayerName(hostName)
    history.replaceState(null, '', buildRoomUrl(link))
    setRoom({ link, newMatch: { setup, initialState: game.rules.createInitialState(setup), hostName } })
  }, [])

  if (hotSeatSetup) return <HotSeatMatch setup={hotSeatSetup} />
  if (!room) return <Lobby game={game} onCreateMatch={createMatch} />
  if (room.link.transport === 'async') return <AsyncMatch room={room.link} newMatch={room.newMatch} />
  if (room.newMatch) return <LiveHostMatch room={room.link} newMatch={room.newMatch} />
  return <LiveGuestMatch room={room.link} />
}
