const MAX_STATUS_VERSION_LENGTH = 28

export function formatServerVersion(version: string): string {
  const numeric = version.match(/\d+(?:\.\d+)*/)
  if (numeric) return `v${numeric[0]}`
  if (version.length <= MAX_STATUS_VERSION_LENGTH) return version
  return `${version.slice(0, MAX_STATUS_VERSION_LENGTH)}…`
}
