import { useState } from 'react'
import { GAME_CONFIG } from '../game.config'
import { Button, Card, FieldLabel, SegmentedControl, TextInput } from './controls'
import { MAX_PLAYER_NAME_LENGTH, normalizePlayerName, recallPlayerName } from './roomLink'
import { isSupabaseConfigured } from './supabaseClient'
import type { GameModule, PlayMode } from './types'

const PLAY_MODES: PlayMode[] = ['async', 'live', 'hot_seat']

const PLAY_MODE_TEXT: Record<PlayMode, { label: string; description: string }> = {
  async: {
    label: 'Async',
    description: 'Take your turn whenever you like. The game is saved online, so share the link and come back later.',
  },
  live: {
    label: 'Live',
    description: 'Everyone plays at the same time over direct peer-to-peer links. The game ends if you close this tab.',
  },
  hot_seat: {
    label: 'Hot Seat',
    description: 'Everyone shares this device and passes it round. Nothing is saved online.',
  },
}

export interface MatchRequest<Settings> {
  settings: Settings
  playerCount: number
  mode: PlayMode
  /** The creator's name; empty for hot seat. */
  hostName: string
}

type LobbyGame<Settings> = Pick<GameModule<Settings, unknown, unknown>, 'defaultSettings' | 'SettingsForm' | 'minPlayers' | 'maxPlayers'>

interface LobbyProps<Settings> {
  game: LobbyGame<Settings>
  onCreateMatch: (request: MatchRequest<Settings>) => void
}

function playerCountOptions(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, offset) => min + offset)
}

export function Lobby<Settings>({ game, onCreateMatch }: LobbyProps<Settings>) {
  const [settings, setSettings] = useState(game.defaultSettings)
  const [playerCount, setPlayerCount] = useState(Math.min(3, game.maxPlayers))
  const [mode, setMode] = useState<PlayMode>('async')
  const [name, setName] = useState(recallPlayerName)
  const isAsyncUnavailable = mode === 'async' && !isSupabaseConfigured()
  const isOnline = mode !== 'hot_seat'
  const { SettingsForm } = game

  function create() {
    const hostName = isOnline ? normalizePlayerName(name) || 'Player 1' : ''
    onCreateMatch({ settings, playerCount, mode, hostName })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-6xl font-extrabold tracking-tight">{GAME_CONFIG.title}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{GAME_CONFIG.tagline}</p>
      </div>

      <Card className="flex w-full max-w-sm flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Players</FieldLabel>
          <SegmentedControl<number>
            options={playerCountOptions(game.minPlayers, game.maxPlayers)}
            value={playerCount}
            onChange={setPlayerCount}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FieldLabel>Play mode</FieldLabel>
          <SegmentedControl<PlayMode> options={PLAY_MODES} value={mode} onChange={setMode} labelOf={option => PLAY_MODE_TEXT[option].label} />
          <p className="text-xs leading-relaxed text-ink-soft">{PLAY_MODE_TEXT[mode].description}</p>
          {isAsyncUnavailable && (
            <p className="text-xs leading-relaxed text-alert">
              Async play needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
            </p>
          )}
        </div>

        {isOnline && (
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Your name</FieldLabel>
            <TextInput value={name} onChange={setName} placeholder="Player 1" maxLength={MAX_PLAYER_NAME_LENGTH} />
          </label>
        )}

        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-ink-soft select-none hover:text-ink">
            Playtest dials
          </summary>
          <div className="pt-3">
            <SettingsForm settings={settings} playerCount={playerCount} onChange={setSettings} />
          </div>
        </details>
      </Card>

      <Button onClick={create} disabled={isAsyncUnavailable} className="px-10 py-3 text-lg">
        Create game
      </Button>
    </div>
  )
}
