import { useCallback, useEffect, useRef, useState } from 'react'
import Peer, { type DataConnection } from 'peerjs'
import { applyPlayerMove } from './moveValidation'
import { ICE_CONFIG, describePeerError, hostPeerId, type GuestMessage, type HostMessage } from './peerConfig'
import type { ConnectionStatus, GameRules, MatchConnection, NewMatch, PlayerIndex, PlayerProfile } from './types'

/**
 * Live (PeerJS) transport for the player who created the room. The host holds seat 0
 * and is the only peer that runs game rules: guests send moves, the host applies the
 * ones from the active player and broadcasts the result.
 *
 * Everyone who connects gets a snapshot first, then takes a free seat, takes back a
 * seat they held before (after a reload or on another device), or watches.
 */

const HOST_SEAT = 0

interface Seat {
  name: string
  /** Null for the host, and for a guest who has dropped out. */
  connection: DataConnection | null
}

interface HostTable<State> {
  state: State
  version: number
  seats: Seat[]
  spectators: Set<DataConnection>
  /** Connected, but not yet seated or watching. */
  undecided: Set<DataConnection>
}

function profilesOf(seats: Seat[]): PlayerProfile[] {
  return seats.map((seat, index) => ({
    name: seat.name,
    isOnline: index === HOST_SEAT || Boolean(seat.connection?.open),
  }))
}

function seatOf(seats: Seat[], connection: DataConnection): PlayerIndex | null {
  const index = seats.findIndex(seat => seat.connection === connection)
  return index === -1 ? null : index
}

function hostStatus(host: {
  errorMessage: string | null
  isOpen: boolean
  seatsTaken: number
  playerCount: number
}): ConnectionStatus {
  if (host.errorMessage) return 'error'
  if (!host.isOpen) return 'connecting'
  return host.seatsTaken < host.playerCount ? 'waiting_for_players' : 'playing'
}

function send<State>(connection: DataConnection, message: HostMessage<State>): void {
  if (connection.open) connection.send(message)
}

export function usePeerHost<Settings, State, Move>(
  roomCode: string,
  rules: GameRules<Settings, State, Move>,
  newMatch: NewMatch<Settings, State>,
): MatchConnection<State, Move> {
  const { playerCount } = newMatch.setup
  const [state, setState] = useState<State>(newMatch.initialState)
  const [players, setPlayers] = useState<PlayerProfile[]>([{ name: newMatch.hostName, isOnline: true }])
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Peer callbacks outlive renders, so they read and write this ref, never React state.
  const table = useRef<HostTable<State>>({
    state: newMatch.initialState,
    version: 0,
    seats: [{ name: newMatch.hostName, connection: null }],
    spectators: new Set(),
    undecided: new Set(),
  })

  const broadcast = useCallback(() => {
    const { state: current, version, seats, spectators, undecided } = table.current
    const snapshot: HostMessage<State> = { type: 'SNAPSHOT', state: current, version, players: profilesOf(seats), playerCount }
    const guests = [...seats.map(seat => seat.connection), ...spectators, ...undecided]
    for (const connection of guests) if (connection) send(connection, snapshot)
    setState(current)
    setPlayers(profilesOf(seats))
  }, [playerCount])

  const applyMove = useCallback(
    (player: PlayerIndex, move: Move) => {
      const nextState = applyPlayerMove(rules, table.current.state, player, move)
      if (nextState === null) return
      table.current.state = nextState
      table.current.version += 1
      broadcast()
    },
    [rules, broadcast],
  )

  useEffect(() => {
    const peer = new Peer(hostPeerId(roomCode), { config: ICE_CONFIG })
    const { seats, spectators, undecided } = table.current

    function assign(connection: DataConnection, role: PlayerIndex | 'spectator') {
      undecided.delete(connection)
      if (role === 'spectator') spectators.add(connection)
      send<State>(connection, { type: 'ROLE', role })
      broadcast()
    }

    function receive(connection: DataConnection, message: GuestMessage<Move>) {
      if (message.type === 'MOVE') {
        const seat = seatOf(seats, connection)
        if (seat !== null && message.version === table.current.version) applyMove(seat, message.move)
        return
      }
      if (seatOf(seats, connection) !== null) return
      if (message.type === 'CLAIM_SEAT' && seats.length < playerCount) {
        seats.push({ name: message.name, connection })
        assign(connection, seats.length - 1)
      } else if (message.type === 'RESUME_SEAT' && message.seat !== HOST_SEAT && message.seat < seats.length) {
        // Knowing the room code is the only credential, so a returning player simply
        // takes the seat over, even if their old connection hasn't timed out yet.
        seats[message.seat].connection = connection
        assign(connection, message.seat)
      } else {
        assign(connection, 'spectator')
      }
    }

    function drop(connection: DataConnection) {
      for (const seat of seats) if (seat.connection === connection) seat.connection = null
      spectators.delete(connection)
      undecided.delete(connection)
      broadcast()
    }

    peer.on('open', () => setIsOpen(true))

    peer.on('connection', connection => {
      connection.on('open', () => {
        undecided.add(connection)
        broadcast()
      })
      // PeerJS delivers untyped payloads; every guest in this app sends GuestMessage.
      connection.on('data', raw => receive(connection, raw as GuestMessage<Move>))
      connection.on('close', () => drop(connection))
      connection.on('error', () => drop(connection))
    })

    peer.on('error', err => setErrorMessage(describePeerError(err)))

    return () => peer.destroy()
  }, [roomCode, playerCount, broadcast, applyMove])

  const submitMove = useCallback((move: Move) => applyMove(HOST_SEAT, move), [applyMove])

  return {
    state,
    role: HOST_SEAT,
    players,
    playerCount,
    status: hostStatus({ errorMessage, isOpen, seatsTaken: players.length, playerCount }),
    errorMessage,
    seatChoice: null,
    submitMove,
  }
}
