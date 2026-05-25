import path from 'path'

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

export function isTrustedRendererUrl(rawUrl: string): boolean {
  const devRendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (devRendererUrl) {
    try {
      const rendererOrigin = new URL(devRendererUrl).origin
      const candidate = new URL(rawUrl)
      if (candidate.origin === rendererOrigin) {
        return true
      }
    } catch {
      return false
    }
  }

  try {
    const candidate = new URL(rawUrl)
    if (candidate.protocol !== 'file:') return false
    const filename = path.basename(decodeURIComponent(candidate.pathname))
    return filename === 'index.html'
  } catch {
    return false
  }
}
