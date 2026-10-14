import { useCallback, useEffect, useRef, useState } from 'react'
import Peer, { type DataConnection } from 'peerjs'
import { ICE_CONFIG, describePeerError, hostPeerId, type PeerMessage } from './peerConfig'
import type { ConnectionStatus, GameRules, MatchConnection, TurnBasedState, TurnPlan } from './types'

/**
 * Live (PeerJS) transport for the player who created the room. The host is always
 * player 1 and is the only peer that runs game rules.
 *
 * Commit-and-hold: the host's own plan is held locally until the guest's plan arrives,
 * so the host never sees the guest's move before committing its own and has no
 * information advantage. Only then does it resolve the turn and broadcast the result.
 */

interface HostConnections<State, Plan> {
  state: State
  guest: DataConnection | null
  spectators: Set<DataConnection>
  hostPlan: Plan | null
  guestPlan: Plan | null
}

export function usePeerHost<Settings, State extends TurnBasedState, Plan extends TurnPlan>(
  roomCode: string,
  rules: GameRules<Settings, State, Plan>,
  settings: Settings,
): MatchConnection<State, Plan> {
  const [state, setState] = useState<State>(() => rules.createInitialState(settings))
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [committedTurn, setCommittedTurn] = useState<number | null>(null)
  const [spectatorCount, setSpectatorCount] = useState(0)

  // Peer callbacks outlive renders, so they read and write this ref, never React state.
  const live = useRef<HostConnections<State, Plan>>({
    state,
    guest: null,
    spectators: new Set(),
    hostPlan: null,
    guestPlan: null,
  })

  const broadcastState = useCallback(() => {
    const { guest, spectators } = live.current
    const message: PeerMessage<State, Plan> = {
      type: 'STATE',
      state: live.current.state,
      spectatorCount: spectators.size,
    }
    for (const conn of [guest, ...spectators]) {
      if (conn?.open) conn.send(message)
    }
    setSpectatorCount(spectators.size)
  }, [])

  const resolveIfBothCommitted = useCallback(() => {
    const { state: current, hostPlan, guestPlan } = live.current
    if (!hostPlan || !guestPlan) return

    live.current.hostPlan = null
    live.current.guestPlan = null
    live.current.state = rules.resolveTurn(current, hostPlan, guestPlan)
    setState(live.current.state)
    broadcastState()
  }, [rules, broadcastState])

  useEffect(() => {
    const peer = new Peer(hostPeerId(roomCode), { config: ICE_CONFIG })

    function admit(conn: DataConnection) {
      const isGuestSlotFree = !live.current.guest?.open
      if (isGuestSlotFree) {
        live.current.guest = conn
        setStatus('playing')
      } else {
        live.current.spectators.add(conn)
      }
      const assigned: PeerMessage<State, Plan> = {
        type: 'ASSIGNED_ROLE',
        role: isGuestSlotFree ? 2 : 'spectator',
      }
      conn.send(assigned)
      broadcastState()
    }

    function drop(conn: DataConnection) {
      if (live.current.guest === conn) live.current.guest = null
      live.current.spectators.delete(conn)
      broadcastState()
    }

    function receive(conn: DataConnection, message: PeerMessage<State, Plan>) {
      if (message.type !== 'SUBMIT_PLAN') return
      if (conn !== live.current.guest) return
      if (message.plan.turn !== live.current.state.turn) return

      live.current.guestPlan = message.plan
      resolveIfBothCommitted()
    }

    peer.on('open', () => setStatus('waiting_for_partner'))

    peer.on('connection', conn => {
      conn.on('open', () => admit(conn))
      // PeerJS delivers untyped payloads; every sender in this app uses PeerMessage.
      conn.on('data', raw => receive(conn, raw as PeerMessage<State, Plan>))
      conn.on('close', () => drop(conn))
      conn.on('error', () => drop(conn))
    })

    peer.on('error', err => {
      setErrorMessage(describePeerError(err))
      setStatus('error')
    })

    return () => peer.destroy()
  }, [roomCode, broadcastState, resolveIfBothCommitted])

  const submitPlan = useCallback(
    (plan: Plan) => {
      if (plan.turn !== live.current.state.turn) return
      live.current.hostPlan = plan
      setCommittedTurn(plan.turn)
      resolveIfBothCommitted()
    },
    [resolveIfBothCommitted],
  )

  return {
    state,
    role: 1,
    status,
    errorMessage,
    hasCommitted: committedTurn === state.turn,
    spectatorCount,
    submitPlan,
  }
}
