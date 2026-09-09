// Maps each game's exact ss_games.name to its subtext shown on the game
// tile. Keyed by name (not position) so it stays correct if games are
// reordered in Supabase. Falls back to a generic line for any game without
// an explicit entry here.
const GAME_DESCRIPTIONS = {
  'Ball-Top Blitz': 'Teams race to collapse and restack a ten cup pyramid with a ping pong ball on top.',
  'Ball-top Blitz': 'Teams race to collapse and restack a ten cup pyramid with a ping pong ball on top.',
  'Rapid-Roll Rumble': 'Teams race to roll 9 ping pong balls into target cups secured at the end of a table.',
  'Nine-cup knockout': 'Teams race to bounce a ping pong ball into each of the nine cups.',
  'Nine-Cup Knockout': 'Teams race to bounce a ping pong ball into each of the nine cups.',
}

export function getGameDescription(gameName) {
  return GAME_DESCRIPTIONS[gameName] || 'Teams race to complete this challenge.'
}
