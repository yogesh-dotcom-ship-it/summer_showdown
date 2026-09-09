// Maps each game's exact ss_games.name to its thumbnail image, imported so
// Vite fingerprints/bundles them. Keyed by name (not position) so it stays
// correct even if games are reordered or renamed in Supabase.
import ballTopBlitz from '../assets/games-images/Ball-top Blitz.png'
import rapidRollRumble from '../assets/games-images/Rapid-Roll Rumble.png'
import nineCupKnockout from '../assets/games-images/Nine-cup knockout.png'

const GAME_IMAGES = {
  'Ball-Top Blitz': ballTopBlitz,
  'Ball-top Blitz': ballTopBlitz,
  'Rapid-Roll Rumble': rapidRollRumble,
  'Nine-cup knockout': nineCupKnockout,
  'Nine-Cup Knockout': nineCupKnockout,
}

export function getGameImage(gameName) {
  return GAME_IMAGES[gameName] || null
}
