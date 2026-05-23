import { isIP } from 'node:net'

export function validateLocalBaseUrl(baseUrl: string, envName: string): string | undefined {
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return `Invalid ${envName}. Use a local URL such as http://127.0.0.1.`
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return `Invalid ${envName} protocol. Only http(s) URLs are allowed.`
  }

  const host = url.hostname.toLowerCase()
  const ipVersion = isIP(host)
  const isIpv4Loopback = ipVersion === 4 && host.split('.')[0] === '127'
  const isIpv6Loopback = ipVersion === 6 && (host === '::1' || host === '0:0:0:0:0:0:0:1')
  const isLoopback = host === 'localhost' || isIpv4Loopback || isIpv6Loopback

  if (!isLoopback) {
    return `KobeanSQL local-only policy requires ${envName} to use localhost or loopback addresses.`
  }

  return undefined
}
