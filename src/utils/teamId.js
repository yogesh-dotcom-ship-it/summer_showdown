// Short, human-readable team codes (e.g. "SS-4F2A") -- friendlier than a raw
// UUID both for the QR payload and for a volunteer to type in by hand if a
// scan ever fails.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // no 0/O/1/I to avoid confusion

export function generateTeamId() {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `SS-${code}`
}
