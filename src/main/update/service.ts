import { app, net, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { appLogger } from '../logger'
import { loadSettings, saveSettings } from '../store'
import { isNewerVersion, normalizeVersion } from './version'

const LATEST_RELEASE_API_URL = 'https://api.github.com/repos/kobenguyent/KobeanSQL/releases/latest'
const RELEASES_PAGE_URL = 'https://github.com/kobenguyent/KobeanSQL/releases'
const FIRST_CHECK_DELAY_MS = 20_000
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000
const FALLBACK_INTERVAL_HOURS = 24

interface GithubLatestReleaseResponse {
  tag_name?: string
  html_url?: string
  name?: string
}

export interface UpdateStatus {
  checking: boolean
  enabled: boolean
  intervalHours: number
  currentVersion: string
  latestVersion?: string
  releaseUrl?: string
  releaseName?: string
  lastCheckedAt?: number
  ignoredVersion?: string
  dismissedVersion?: string
  dismissedAt?: number
  updateAvailable: boolean
  shouldNotify: boolean
  error?: string
}

export interface UpdateService {
  initialize(): void
  reschedule(): void
  getStatus(): UpdateStatus
  checkForUpdates(manual?: boolean): Promise<UpdateStatus>
  ignoreVersion(version?: string): Promise<UpdateStatus>
  dismissVersion(version?: string): Promise<UpdateStatus>
  openReleasePage(url?: string): Promise<{ success: boolean; url: string }>
}

export function createUpdateService(): UpdateService {
  let checking = false
  let initialized = false
  let timer: NodeJS.Timeout | null = null
  let interval: NodeJS.Timeout | null = null
  let lastError: string | undefined

  const clearSchedule = (): void => {
    if (timer) clearTimeout(timer)
    if (interval) clearInterval(interval)
    timer = null
    interval = null
  }

  const getIntervalMs = (intervalHours: number): number => {
    const safeHours = Number.isFinite(intervalHours) && intervalHours > 0 ? intervalHours : FALLBACK_INTERVAL_HOURS
    return safeHours * 60 * 60 * 1000
  }

  const shouldNotify = (): boolean => {
    const settings = loadSettings()
    const { updates } = settings
    const latestVersion = updates.cache.latestVersion
    if (!latestVersion || !isNewerVersion(latestVersion, app.getVersion())) return false
    if (updates.ignoredVersion && normalizeVersion(updates.ignoredVersion) === normalizeVersion(latestVersion)) {
      return false
    }
    if (
      updates.dismissedVersion &&
      normalizeVersion(updates.dismissedVersion) === normalizeVersion(latestVersion) &&
      updates.dismissedAt &&
      Date.now() - updates.dismissedAt < DISMISS_TTL_MS
    ) {
      return false
    }
    return true
  }

  const toStatus = (): UpdateStatus => {
    const settings = loadSettings()
    const latestVersion = settings.updates.cache.latestVersion
    const updateAvailable = !!latestVersion && isNewerVersion(latestVersion, app.getVersion())
    return {
      checking,
      enabled: settings.updates.autoCheckEnabled,
      intervalHours: settings.updates.checkIntervalHours,
      currentVersion: app.getVersion(),
      latestVersion,
      releaseUrl: settings.updates.cache.releaseUrl,
      releaseName: settings.updates.cache.releaseName,
      lastCheckedAt: settings.updates.cache.checkedAt,
      ignoredVersion: settings.updates.ignoredVersion,
      dismissedVersion: settings.updates.dismissedVersion,
      dismissedAt: settings.updates.dismissedAt,
      updateAvailable,
      shouldNotify: updateAvailable ? shouldNotify() : false,
      error: lastError
    }
  }

  const persistCheckCache = (partial: {
    latestVersion?: string
    releaseUrl?: string
    releaseName?: string
    checkedAt: number
    etag?: string
  }): void => {
    const settings = loadSettings()
    saveSettings({
      ...settings,
      updates: {
        ...settings.updates,
        cache: {
          ...settings.updates.cache,
          ...partial
        }
      }
    })
  }

  const fetchLatestRelease = async (): Promise<void> => {
    const settings = loadSettings()
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'KobeanSQL-Update-Checker'
    }
    if (settings.updates.cache.etag) {
      headers['If-None-Match'] = settings.updates.cache.etag
    }

    const response = await fetch(LATEST_RELEASE_API_URL, { headers })
    const checkedAt = Date.now()
    if (response.status === 304) {
      persistCheckCache({
        checkedAt,
        etag: response.headers.get('etag') ?? settings.updates.cache.etag
      })
      return
    }
    if (!response.ok) {
      throw new Error(`Update check failed (${response.status})`)
    }

    const body = (await response.json()) as GithubLatestReleaseResponse
    const latestVersion = body.tag_name ? normalizeVersion(body.tag_name) : undefined
    if (!latestVersion) {
      throw new Error('Release metadata missing tag_name')
    }

    persistCheckCache({
      latestVersion,
      releaseUrl: body.html_url || RELEASES_PAGE_URL,
      releaseName: body.name || undefined,
      checkedAt,
      etag: response.headers.get('etag') ?? undefined
    })
  }

  const shouldSkipCheck = (manual: boolean): { skip: boolean; reason?: string } => {
    const settings = loadSettings()
    if (is.dev) {
      return { skip: true, reason: 'Update checks are disabled in development mode' }
    }
    if (!manual && !settings.updates.autoCheckEnabled) {
      return { skip: true, reason: undefined }
    }
    if (!net.isOnline()) {
      return { skip: true, reason: manual ? 'No network connectivity' : undefined }
    }
    return { skip: false }
  }

  const checkForUpdates = async (manual = false): Promise<UpdateStatus> => {
    if (checking) return toStatus()
    const skip = shouldSkipCheck(manual)
    if (skip.skip) {
      lastError = skip.reason
      return toStatus()
    }
    checking = true
    try {
      await fetchLatestRelease()
      lastError = undefined
    } catch (error) {
      lastError = (error as Error).message
      appLogger.warn('Update check failed', { error: lastError })
    } finally {
      checking = false
    }
    return toStatus()
  }

  const scheduleChecks = (): void => {
    clearSchedule()
    const settings = loadSettings()
    if (!settings.updates.autoCheckEnabled || is.dev) return

    const intervalMs = getIntervalMs(settings.updates.checkIntervalHours)
    const elapsedMs = settings.updates.cache.checkedAt ? Date.now() - settings.updates.cache.checkedAt : Number.POSITIVE_INFINITY
    const firstDelay = Number.isFinite(elapsedMs) && elapsedMs < intervalMs
      ? Math.max(10_000, intervalMs - elapsedMs)
      : FIRST_CHECK_DELAY_MS

    timer = setTimeout(() => {
      void checkForUpdates(false)
    }, firstDelay)

    interval = setInterval(() => {
      void checkForUpdates(false)
    }, intervalMs)
  }

  return {
    initialize(): void {
      if (initialized) return
      initialized = true
      scheduleChecks()
    },
    reschedule(): void {
      scheduleChecks()
    },
    getStatus(): UpdateStatus {
      return toStatus()
    },
    checkForUpdates,
    async ignoreVersion(version?: string): Promise<UpdateStatus> {
      const settings = loadSettings()
      const target = normalizeVersion(version || settings.updates.cache.latestVersion || '')
      if (!target) return toStatus()
      saveSettings({
        ...settings,
        updates: {
          ...settings.updates,
          ignoredVersion: target,
          dismissedVersion: undefined,
          dismissedAt: undefined
        }
      })
      return toStatus()
    },
    async dismissVersion(version?: string): Promise<UpdateStatus> {
      const settings = loadSettings()
      const target = normalizeVersion(version || settings.updates.cache.latestVersion || '')
      if (!target) return toStatus()
      saveSettings({
        ...settings,
        updates: {
          ...settings.updates,
          dismissedVersion: target,
          dismissedAt: Date.now()
        }
      })
      return toStatus()
    },
    async openReleasePage(url?: string): Promise<{ success: boolean; url: string }> {
      const target = url || loadSettings().updates.cache.releaseUrl || RELEASES_PAGE_URL
      await shell.openExternal(target)
      return { success: true, url: target }
    }
  }
}
