import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'mailto:'])

export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

export function isTrustedRendererUrl(rawUrl: string): boolean {
  try {
    const devRendererUrl = process.env['ELECTRON_RENDERER_URL']
    const candidate = new URL(rawUrl)
    if (devRendererUrl) {
      const rendererOrigin = new URL(devRendererUrl).origin
      return candidate.origin === rendererOrigin
    }

    if (candidate.protocol !== 'file:') return false
    const expectedRendererEntry = path.resolve(__dirname, '../renderer/index.html')
    const sanitizedCandidate = new URL(candidate.toString())
    sanitizedCandidate.hash = ''
    sanitizedCandidate.search = ''
    const candidatePath = path.resolve(fileURLToPath(sanitizedCandidate))
    const expectedPath = path.resolve(fileURLToPath(pathToFileURL(expectedRendererEntry)))
    return candidatePath === expectedPath
  } catch {
    return false
  }
}
