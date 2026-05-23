export const XP_ACTIONS = {
  attend_quest: 20,
  organize_quest: 30,
  bring_friend: 10,
  discover_location: 25,
  find_hidden_gem: 50,
  pioneer_gem: 75,
  make_friend: 10,
  rate_gem: 10,
  badge_earned: 'varies'
} as const

export function getLevelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

export function getXPForLevel(level: number): number {
  return (level - 1) * (level - 1) * 100
}

export function getXPForNextLevel(level: number): number {
  return level * level * 100
}

export function getProgressInLevel(xp: number): number {
  const level = getLevelFromXP(xp)
  const currentLevelXP = getXPForLevel(level)
  const nextLevelXP = getXPForNextLevel(level)
  return (xp - currentLevelXP) / (nextLevelXP - currentLevelXP)
}

export function getLevelTitle(level: number): string {
  if (level >= 30) return 'Legend'
  if (level >= 20) return 'Quest Master'
  if (level >= 15) return 'Quest Knight'
  if (level >= 10) return 'Explorer'
  if (level >= 5) return 'Adventurer'
  return 'Wanderer'
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return '#FFD700'
    case 'rare': return '#6C63FF'
    case 'uncommon': return '#58CC02'
    default: return '#A8A8B3'
  }
}
