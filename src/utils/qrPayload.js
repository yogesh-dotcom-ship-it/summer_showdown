// The QR code carries everything the scan station needs -- team id, team
// name, game, and the employee IDs -- because employee IDs are deliberately
// NOT stored in the database (company legal policy). Short keys keep the
// encoded payload small enough for a reliably-scannable QR.
//
//   { v: 1, t: team_id, n: team_name, g: game_name, e: [eid, ...] }

export function encodeTeamQR({ teamId, teamName, gameName, eids }) {
  return JSON.stringify({
    v: 1,
    t: teamId,
    n: teamName,
    g: gameName,
    e: eids ?? [],
  })
}

// Returns { teamId, teamName, gameName, eids } or null if the text isn't a
// recognised payload. Falls back to treating a bare string as a legacy
// team_id (older QR codes that only encoded the id).
export function decodeTeamQR(text) {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && parsed.t) {
      return {
        teamId: String(parsed.t),
        teamName: parsed.n ? String(parsed.n) : null,
        gameName: parsed.g ? String(parsed.g) : null,
        eids: Array.isArray(parsed.e) ? parsed.e.map(String) : [],
      }
    }
  } catch {
    // not JSON -- treat as a legacy bare team_id
  }

  return { teamId: trimmed, teamName: null, gameName: null, eids: [] }
}
