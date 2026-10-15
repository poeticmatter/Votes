import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Peer, { type DataConnection } from 'peerjs'
import { ICE_CONFIG, describePeerError, hostPeerId, type GuestMessage, type HostMessage } from './peerConfig'
import { recallRole, rememberRole } from './roomLink'
import type { ConnectionStatus, MatchConnection, PlayerProfile, SeatChoice, UserRole } from './types'

/**
 * Live (PeerJS) transport for anyone who opens a room link. The guest never runs game
 * rules: it sends its moves and shows whatever state the host broadcasts.
 *
 * A browser that held a seat before asks for it back automatically, including after a
 * dropped connection; otherwise it waits for the person to take a seat or watch.
 */

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY_MS = 1500

type LinkStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface Snapshot<State> {
  state: State
  version: number
  players: PlayerProfile[]
  playerCount: number
}

function guestStatus<State>(
  link: LinkStatus,
  errorMessage: string | null,
  snapshot: Snapshot<State> | null,
  role: UserRole | null,
): ConnectionStatus {
  if (errorMessage) return 'error'
  if (link === 'disconnected' || link === 'reconnecting') return link
  if (!snapshot) return 'connecting'
  if (role === null) return 'choosing_seat'
  if (snapshot.players.length < snapshot.playerCount) return 'waiting_for_players'
  return role === 'spectator' ? 'spectating' : 'playing'
}

/** How a returning browser rejoins: by seat if it had one, otherwise as a spectator. */
function rejoinMessage(role: UserRole): GuestMessage<never> {
  return role === 'spectator' ? { type: 'WATCH' } : { type: 'RESUME_SEAT', seat: role }
}

export function usePeerGuest<State, Move>(roomCode: string): MatchConnection<State, Move> {
  const [snapshot, setSnapshot] = useState<Snapshot<State> | null>(null)
  const [role, setRole] = useState<UserRole | null>(() => recallRole(roomCode))
  const [link, setLink] = useState<LinkStatus>('connecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const hostConnection = useRef<DataConnection | null>(null)
  // Read by the connection's 'open' handler to rejoin after a reconnect.
  const currentRole = useRef(role)
  const currentVersion = useRef<number | null>(null)

  const sendToHost = useCallback((message: GuestMessage<Move>) => {
    if (hostConnection.current?.open) hostConnection.current.send(message)
  }, [])

  useEffect(() => {
    let peer: Peer | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempts = 0
    let isDisposed = false

    function scheduleReconnect() {
      if (isDisposed || reconnectTimer !== null) return
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setLink('disconnected')
        return
      }
      reconnectAttempts++
      setLink('reconnecting')
      peer?.destroy()
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, reconnectAttempts * RECONNECT_BASE_DELAY_MS)
    }

    function receive(message: HostMessage<State>) {
      if (message.type === 'ROLE') {
        currentRole.current = message.role
        setRole(message.role)
        rememberRole(roomCode, message.role)
      } else {
        currentVersion.current = message.version
        setSnapshot({ state: message.state, version: message.version, players: message.players, playerCount: message.playerCount })
      }
    }

    function connect() {
      const isReconnecting = reconnectAttempts > 0
      peer = new Peer({ config: ICE_CONFIG })

      peer.on('open', () => {
        const connection = peer!.connect(hostPeerId(roomCode), { reliable: true })
        hostConnection.current = connection
        connection.on('open', () => {
          reconnectAttempts = 0
          setLink('connected')
          if (currentRole.current !== null) connection.send(rejoinMessage(currentRole.current))
        })
        // Host-only messages; PeerJS delivers untyped payloads.
        connection.on('data', raw => receive(raw as HostMessage<State>))
        connection.on('close', scheduleReconnect)
        connection.on('error', scheduleReconnect)
      })

      peer.on('error', err => {
        // A missing host on first contact is a bad link; mid-game it may just be a blip.
        if (err.type === 'peer-unavailable' && isReconnecting) {
          scheduleReconnect()
          return
        }
        setErrorMessage(describePeerError(err))
      })
    }

    connect()

    return () => {
      isDisposed = true
      if (reconnectTimer !== null) clearTimeout(reconnectTimer)
      peer?.destroy()
      hostConnection.current = null
    }
  }, [roomCode])

  const seatChoice = useMemo<SeatChoice>(
    () => ({
      claimSeat: name => sendToHost({ type: 'CLAIM_SEAT', name }),
      resumeSeat: seat => sendToHost({ type: 'RESUME_SEAT', seat }),
      watch: () => sendToHost({ type: 'WATCH' }),
    }),
    [sendToHost],
  )

  const submitMove = useCallback(
    (move: Move) => {
      if (typeof currentRole.current !== 'number' || currentVersion.current === null) return
      sendToHost({ type: 'MOVE', version: currentVersion.current, move })
    },
    [sendToHost],
  )

  const status = guestStatus(link, errorMessage, snapshot, role)
  return {
    state: snapshot?.state ?? null,
    role: role ?? 'spectator',
    players: snapshot?.players ?? [],
    playerCount: snapshot?.playerCount ?? null,
    status,
    errorMessage,
    seatChoice: status === 'choosing_seat' ? seatChoice : null,
    submitMove,
  }
}
