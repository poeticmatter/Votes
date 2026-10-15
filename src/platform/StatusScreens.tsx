import { useState, type ReactNode } from 'react'
import { Button, Card, ColorSwatch, FieldLabel, TextInput } from './controls'
import { buildRoomUrl, MAX_PLAYER_NAME_LENGTH, normalizePlayerName, recallPlayerName, rememberPlayerName, type RoomLink } from './roomLink'
import type { PlayerAppearance, PlayerIndex, PlayerProfile, SeatChoice } from './types'

type AppearanceOf = (index: PlayerIndex) => PlayerAppearance

function returnToLobby() {
  window.location.href = window.location.pathname
}

function CenteredScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">{children}</div>
}

export function StatusScreen({ message }: { message: string }) {
  return (
    <CenteredScreen>
      <p className="text-lg text-ink-soft">{message}</p>
      <Button tone="secondary" onClick={returnToLobby}>
        Back to lobby
      </Button>
    </CenteredScreen>
  )
}

export function ProgressScreen({ title, detail }: { title: string; detail?: string }) {
  return (
    <CenteredScreen>
      <p className="text-lg font-semibold">{title}</p>
      {detail && <p className="animate-pulse text-sm text-ink-soft">{detail}</p>}
    </CenteredScreen>
  )
}

/** One row per seat: who sits there, or that it's still open. */
function SeatList({
  players,
  playerCount,
  appearanceOf,
  renderAction,
}: {
  players: PlayerProfile[]
  playerCount: number
  appearanceOf: AppearanceOf
  renderAction?: (index: PlayerIndex) => ReactNode
}) {
  return (
    <ul className="flex w-full flex-col divide-y divide-slot text-left">
      {Array.from({ length: playerCount }, (_, index) => {
        const player = players[index]
        const appearance = appearanceOf(index)
        return (
          <li key={index} className="flex items-center gap-3 py-2">
            <ColorSwatch color={appearance.color} size={18} />
            <span className={`flex-1 ${player ? 'font-semibold' : 'text-ink-faint'}`}>
              {player ? player.name : `Open seat (${appearance.name})`}
            </span>
            {player && renderAction?.(index)}
          </li>
        )
      })}
    </ul>
  )
}

function ShareLink({ room }: { room: RoomLink }) {
  const shareUrl = buildRoomUrl(room)
  const [isCopied, setIsCopied] = useState(false)
  function copy() {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => setIsCopied(true))
      .catch(err => console.warn('Could not copy the room link; select it by hand instead.', err))
  }
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex items-center gap-2">
        <code className="flex-1 select-all break-all rounded-lg border border-rule bg-paper px-3 py-2 text-left text-sm">
          {shareUrl}
        </code>
        <Button tone="secondary" onClick={copy}>
          {isCopied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="font-mono text-xs text-ink-faint">Room {room.code}</p>
    </div>
  )
}

export function WaitingForPlayersScreen({
  room,
  players,
  playerCount,
  appearanceOf,
}: {
  room: RoomLink
  players: PlayerProfile[]
  playerCount: number
  appearanceOf: AppearanceOf
}) {
  const missing = playerCount - players.length
  return (
    <CenteredScreen>
      <h2 className="text-2xl font-bold">
        Waiting for {missing} more {missing === 1 ? 'player' : 'players'}
      </h2>
      <p className="text-sm text-ink-soft">Send them this link. The game starts when every seat is taken.</p>
      <ShareLink room={room} />
      <Card className="w-full max-w-sm">
        <SeatList players={players} playerCount={playerCount} appearanceOf={appearanceOf} />
      </Card>
    </CenteredScreen>
  )
}

/** Shown to a browser that opened a room link but holds no seat in it yet. */
export function JoinScreen({
  players,
  playerCount,
  appearanceOf,
  seatChoice,
}: {
  players: PlayerProfile[]
  playerCount: number
  appearanceOf: AppearanceOf
  seatChoice: SeatChoice
}) {
  const [name, setName] = useState(recallPlayerName)
  const nextSeat = players.length
  const hasOpenSeat = nextSeat < playerCount

  function join() {
    const chosenName = normalizePlayerName(name) || `Player ${nextSeat + 1}`
    rememberPlayerName(chosenName)
    seatChoice.claimSeat(chosenName)
  }

  return (
    <CenteredScreen>
      <h2 className="text-2xl font-bold">{hasOpenSeat ? 'Join the game' : 'This game is full'}</h2>
      <Card className="flex w-full max-w-sm flex-col gap-4">
        {hasOpenSeat && (
          <>
            <label className="flex flex-col gap-1.5 text-left">
              <FieldLabel>Your name</FieldLabel>
              <TextInput value={name} onChange={setName} placeholder={`Player ${nextSeat + 1}`} maxLength={MAX_PLAYER_NAME_LENGTH} />
            </label>
            <Button onClick={join}>Play as {appearanceOf(nextSeat).name}</Button>
          </>
        )}
        <SeatList
          players={players}
          playerCount={playerCount}
          appearanceOf={appearanceOf}
          renderAction={index => (
            <button
              type="button"
              onClick={() => seatChoice.resumeSeat(index)}
              className="text-xs font-semibold text-ink-soft underline hover:text-ink"
            >
              That’s me
            </button>
          )}
        />
        <Button tone="secondary" onClick={seatChoice.watch}>
          Just watch
        </Button>
      </Card>
    </CenteredScreen>
  )
}
