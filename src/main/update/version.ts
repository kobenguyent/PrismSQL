function parseVersion(version: string): { core: number[]; preRelease: string[] } | null {
  const normalized = version.trim().replace(/^v/i, '')
  if (!normalized) return null
  const [corePart, preReleasePart = ''] = normalized.split('-', 2)
  const coreTokens = corePart.split('.')
  if (coreTokens.length === 0 || coreTokens.some((token) => !/^\d+$/.test(token))) return null
  return {
    core: coreTokens.map((token) => Number.parseInt(token, 10)),
    preRelease: preReleasePart ? preReleasePart.split('.') : []
  }
}

function comparePreRelease(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0
  if (a.length === 0) return 1
  if (b.length === 0) return -1

  const maxLen = Math.max(a.length, b.length)
  for (let i = 0; i < maxLen; i += 1) {
    const aPart = a[i]
    const bPart = b[i]
    if (aPart === undefined) return -1
    if (bPart === undefined) return 1
    const aIsNum = /^\d+$/.test(aPart)
    const bIsNum = /^\d+$/.test(bPart)
    if (aIsNum && bIsNum) {
      const diff = Number.parseInt(aPart, 10) - Number.parseInt(bPart, 10)
      if (diff !== 0) return diff > 0 ? 1 : -1
      continue
    }
    if (aIsNum && !bIsNum) return -1
    if (!aIsNum && bIsNum) return 1
    if (aPart === bPart) continue
    return aPart > bPart ? 1 : -1
  }
  return 0
}

export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '')
}

export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a)
  const parsedB = parseVersion(b)
  if (!parsedA || !parsedB) return 0

  const maxCoreLen = Math.max(parsedA.core.length, parsedB.core.length)
  for (let i = 0; i < maxCoreLen; i += 1) {
    const aVal = parsedA.core[i] ?? 0
    const bVal = parsedB.core[i] ?? 0
    if (aVal === bVal) continue
    return aVal > bVal ? 1 : -1
  }

  return comparePreRelease(parsedA.preRelease, parsedB.preRelease)
}

export function isNewerVersion(candidateVersion: string, currentVersion: string): boolean {
  return compareVersions(candidateVersion, currentVersion) > 0
}
