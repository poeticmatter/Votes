import { useEffect } from 'react'
import { GAME_CONFIG } from '../game.config'

/** Flags the browser tab when it's this player's turn, so an async game can sit in the background. */
export function useTurnTitle(isMyTurn: boolean): void {
  useEffect(() => {
    document.title = isMyTurn ? `● Your turn · ${GAME_CONFIG.title}` : GAME_CONFIG.title
  }, [isMyTurn])

  useEffect(() => () => void (document.title = GAME_CONFIG.title), [])
}
