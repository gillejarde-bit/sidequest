const fallbackUrls: Record<string, string> = {
  '🦊': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/fox.webp',
  '🐱': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/cat-face.webp',
  '🐼': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/panda.webp',
  '🦁': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/lion.webp',
  '🐸': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/frog.webp',
  '🐨': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/koala.webp',
  '🦖': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/t-rex.webp',
  '🦄': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/unicorn.webp',
  '🧙‍♂️': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/mage.webp',
  '🥷': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/ninja.webp',
  '🧑‍🚀': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/astronaut.webp',
  '👾': 'https://cdn.jsdelivr.net/npm/@lobehub/assets-emoji/assets/alien-monster.webp',
}

export function getAvatarUrl(avatarUrl: string | null | undefined, username?: string): string {
  if (!avatarUrl) {
    const seed = username || 'avatar'
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`
  }

  if (avatarUrl.startsWith('fallback:')) {
    const emoji = avatarUrl.replace('fallback:', '')
    if (fallbackUrls[emoji]) {
      return fallbackUrls[emoji]
    }
  }

  if (fallbackUrls[avatarUrl]) {
    return fallbackUrls[avatarUrl]
  }

  return avatarUrl
}
