// One colour per game, assigned by the game's position in the (name-ordered)
// games list. `bg` is the pale card/podium tint; `bgBright` a more
// saturated variant (used on the registration success screen); `border`
// the accent line.
export const GAME_COLORS = [
  { bg: '#fffbe6', bgBright: '#fff3bf', border: '#faad14' }, // 1 - Yellow
  { bg: '#e6f7ff', bgBright: '#d0ebff', border: '#1890ff' }, // 2 - Blue
  { bg: '#f6ffed', bgBright: '#d3f9d8', border: '#52c41a' }, // 3 - Green
  { bg: '#fff7e6', bgBright: '#ffe8cc', border: '#ff7a45' }, // 4 - Orange
  { bg: '#f9f0ff', bgBright: '#eebefa', border: '#722ed1' }, // 5 - Purple
  { bg: '#fff1f0', bgBright: '#ffc9c9', border: '#ff4d4f' }, // 6 - Red
]

// By game name against the ordered games list.
export function getGameColor(gameName, games) {
  const idx = games.findIndex((g) => g.name === gameName)
  return GAME_COLORS[(idx >= 0 ? idx : 0) % GAME_COLORS.length]
}

// By numeric index (used where the caller already has the position).
export function getGameColorByIndex(index) {
  return GAME_COLORS[index % GAME_COLORS.length]
}
