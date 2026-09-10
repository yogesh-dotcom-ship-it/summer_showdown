// Generates alternative team names when the one a user typed is taken.
// Word-swap approach: swap the last word for a themed synonym, prepend a
// punchy adjective, or pluralise -- then keep only variants that aren't
// themselves already taken, so every suggestion returned is actually free.

// Common last words in team names -> on-theme swaps.
const WORD_SWAPS = {
  killers: ['Slayers', 'Assassins', 'Hunters', 'Reapers'],
  killer: ['Slayer', 'Assassin', 'Hunter', 'Reaper'],
  squad: ['Crew', 'Unit', 'Brigade', 'Force'],
  crew: ['Squad', 'Gang', 'Collective', 'Outfit'],
  team: ['Squad', 'Crew', 'Alliance', 'Union'],
  masters: ['Champions', 'Legends', 'Titans', 'Aces'],
  master: ['Champion', 'Legend', 'Titan', 'Ace'],
  kings: ['Royals', 'Rulers', 'Monarchs', 'Emperors'],
  stars: ['Comets', 'Novas', 'Meteors', 'Rockets'],
  warriors: ['Fighters', 'Gladiators', 'Raiders', 'Vanguard'],
  legends: ['Icons', 'Myths', 'Heroes', 'Titans'],
}

// Adjectives to prepend when a swap isn't available.
const ADJECTIVES = [
  'Fearless', 'Rapid', 'Elite', 'Savage', 'Golden', 'Mighty',
  'Turbo', 'Blazing', 'Iron', 'Wild', 'Prime', 'Rogue',
]

function titleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * @param {string} baseName        the taken name the user typed
 * @param {Set<string>} takenLower  lowercased existing team names
 * @returns {string[]}             up to 3 free alternative names
 */
export function suggestTeamNames(baseName, takenLower) {
  const trimmed = baseName.trim().replace(/\s+/g, ' ')
  const words = trimmed.split(' ')
  const lastWord = words[words.length - 1].toLowerCase()

  const candidates = []

  // 1. Swap the last word for a themed synonym.
  const swaps = WORD_SWAPS[lastWord] || []
  for (const swap of swaps) {
    candidates.push([...words.slice(0, -1), swap].join(' '))
  }

  // 2. Add an adjective -- after a leading "The" if present, else prepend.
  const hasLeadingThe = words[0].toLowerCase() === 'the' && words.length > 1
  for (const adj of ADJECTIVES) {
    if (hasLeadingThe) {
      candidates.push(`The ${adj} ${words.slice(1).join(' ')}`)
    } else {
      candidates.push(`${adj} ${trimmed}`)
    }
  }

  // 3. Pluralise the last word (naive) if it isn't already plural.
  if (!lastWord.endsWith('s')) {
    candidates.push(`${trimmed}s`)
    candidates.push(`The ${trimmed}s`)
  }

  // Dedupe, drop the original, drop anything already taken, take 3.
  const seen = new Set([trimmed.toLowerCase()])
  const free = []
  for (const c of candidates) {
    const clean = titleCase(c.trim())
    const key = clean.toLowerCase()
    if (seen.has(key) || takenLower.has(key)) continue
    seen.add(key)
    free.push(clean)
    if (free.length === 3) break
  }
  return free
}
