import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const openExternalMock = vi.fn()
const openPathMock = vi.fn()
const isOnlineMock = vi.fn(() => true)
const getVersionMock = vi.fn(() => '1.0.0')

let currentSettings = {
  queryLimit: 100,
  updates: {
    autoCheckEnabled: true,
    checkIntervalHours: 24,
    cache: {
      downloadUrl: 'https://github.com/kobenguyent/KobeanSQL/releases/download/v2.0.0/KobeanSQL.AppImage'
    }
  }
}

const loadSettingsMock = vi.fn(() => currentSettings)
const saveSettingsMock = vi.fn((next) => {
  currentSettings = next
})

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => os.tmpdir()),
    getVersion: getVersionMock
  },
  net: {
    isOnline: isOnlineMock
  },
  shell: {
    openExternal: openExternalMock,
    openPath: openPathMock
  }
}))

vi.mock('@electron-toolkit/utils', () => ({
  is: { dev: false }
}))

vi.mock('../src/main/store', () => ({
  loadSettings: loadSettingsMock,
  saveSettings: saveSettingsMock
}))

vi.mock('../src/main/logger', () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

function makeBody(chunks: number[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(chunks))
      controller.close()
    }
  })
}

describe('update service downloads', () => {
  const downloadedFile = path.join(os.tmpdir(), 'kobeansql-update', 'KobeanSQL.AppImage')

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    currentSettings = {
      queryLimit: 100,
      updates: {
        autoCheckEnabled: true,
        checkIntervalHours: 24,
        cache: {
          downloadUrl: 'https://github.com/kobenguyent/KobeanSQL/releases/download/v2.0.0/KobeanSQL.AppImage'
        }
      }
    }
    try { fs.unlinkSync(downloadedFile) } catch {
      // File is absent for most test setups.
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    try { fs.unlinkSync(downloadedFile) } catch {
      // File may already have been removed by the test.
    }
  })

  it('follows only validated redirect hosts for update downloads', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { location: 'https://objects.githubusercontent.com/github-production-release-asset/test/KobeanSQL.AppImage' }
      }))
      .mockResolvedValueOnce(new Response(makeBody([1, 2, 3]), {
        status: 200,
        headers: { 'content-length': '3' }
      }))
    vi.stubGlobal('fetch', fetchMock)

    const { createUpdateService } = await import('../src/main/update/service')
    const service = createUpdateService()
    const status = await service.downloadUpdate()

    expect(status.downloadState).toBe('ready')
    expect(status.downloadProgress).toBe(100)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      currentSettings.updates.cache.downloadUrl,
      expect.objectContaining({ redirect: 'manual' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://objects.githubusercontent.com/github-production-release-asset/test/KobeanSQL.AppImage',
      expect.objectContaining({ redirect: 'manual' })
    )
    expect(fs.existsSync(downloadedFile)).toBe(true)
  })

  it('rejects redirected downloads to untrusted hosts', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, {
      status: 302,
      headers: { location: 'https://evil.example.com/KobeanSQL.AppImage' }
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { createUpdateService } = await import('../src/main/update/service')
    const service = createUpdateService()
    const status = await service.downloadUpdate()

    expect(status.downloadState).toBe('error')
    expect(status.downloadError).toBe('Invalid download URL.')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fs.existsSync(downloadedFile)).toBe(false)
  })
})
