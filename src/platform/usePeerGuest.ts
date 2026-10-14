import { useCallback, useEffect, useRef, useState } from 'react'
import Peer, { type DataConnection } from 'peerjs'
import { ICE_CONFIG, describePeerError, hostPeerId, type PeerMessage } from './peerConfig'
import type { ConnectionStatus, MatchConnection, TurnBasedState, TurnPlan, UserRole } from './types'

/**
 * Live (PeerJS) transport for anyone who opens a room link. The host decides whether
 * this peer plays as player 2 or spectates. The guest never runs game rules: it only
 * sends its plan and applies whatever state the host broadcasts.
 */

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_DELAY_MS = 1500

export function usePeerGuest<State extends TurnBasedState, Plan extends TurnPlan>(
  roomCode: string,
): MatchConnection<State, Plan> {
  const [state, setState] = useState<State | null>(null)
  const [role, setRole] = useState<UserRole>('spectator')
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [committedTurn, setCommittedTurn] = useState<number | null>(null)
  const [spectatorCount, setSpectatorCount] = useState(0)

  const hostConnection = useRef<DataConnection | null>(null)

  useEffect(() => {
    let peer: Peer | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempts = 0
    let isDisposed = false

    function scheduleReconnect() {
      if (isDisposed || reconnectTimer !== null) return
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setStatus('disconnected')
        return
      }
      reconnectAttempts++
      setStatus('reconnecting')
      peer?.destroy()
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, reconnectAttempts * RECONNECT_BASE_DELAY_MS)
    }

    function receive(message: PeerMessage<State, Plan>) {
      if (message.type === 'ASSIGNED_ROLE') {
        setRole(message.role)
        setStatus(message.role === 'spectator' ? 'spectating' : 'playing')
        reconnectAttempts = 0
      } else if (message.type === 'STATE') {
        setState(message.state)
        setSpectatorCount(message.spectatorCount)
      }
    }

    function connect() {
      const isReconnecting = reconnectAttempts > 0
      peer = new Peer({ config: ICE_CONFIG })

      peer.on('open', () => {
        const conn = peer!.connect(hostPeerId(roomCode), { reliable: true })
        hostConnection.current = conn
        // Host-only messages; PeerJS delivers untyped payloads.
        conn.on('data', raw => receive(raw as PeerMessage<State, Plan>))
        conn.on('close', scheduleReconnect)
        conn.on('error', scheduleReconnect)
      })

      peer.on('error', err => {
        // A missing host on first contact is a bad link; mid-game it may just be a blip.
        if (err.type === 'peer-unavailable' && isReconnecting) {
          scheduleReconnect()
          return
        }
        setErrorMessage(describePeerError(err))
        setStatus('error')
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

  const submitPlan = useCallback(
    (plan: Plan) => {
      if (role === 'spectator' || !hostConnection.current?.open) return
      const message: PeerMessage<State, Plan> = { type: 'SUBMIT_PLAN', plan }
      hostConnection.current.send(message)
      setCommittedTurn(plan.turn)
    },
    [role],
  )

  return {
    state,
    role,
    status,
    errorMessage,
    hasCommitted: state !== null && committedTurn === state.turn,
    spectatorCount,
    submitPlan,
  }
}
