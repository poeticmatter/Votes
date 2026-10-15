import { TurnBasedGameApp } from 'game-kit/turns'
import { game } from './game'
import { GAME_CONFIG } from './game.config'

export default function App() {
  return <TurnBasedGameApp config={GAME_CONFIG} game={game} />
}
