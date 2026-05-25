import { beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'path'
import { pathToFileURL } from 'url'

const handleMock = vi.fn()

vi.mock('electron', () => ({
  ipcMain: { handle: handleMock },
  dialog: {},
  shell: { openPath: vi.fn() }
}))

vi.mock('../src/main/store', () => ({
  loadConnections: vi.fn(() => []),
  saveConnections: vi.fn(),
  loadSavedQueries: vi.fn(() => []),
  writeSavedQueries: vi.fn(),
  loadSettings: vi.fn(() => ({ queryLimit: 100, updates: { autoCheckEnabled: true, checkIntervalHours: 24, cache: {} } })),
  sanitizeSettings: vi.fn((s) => s),
  saveSettings: vi.fn(),
  exportConnectionsToPath: vi.fn(),
  importConnectionsFromPath: vi.fn()
}))

vi.mock('../src/main/ai/service', () => ({
  createLocalAIService: vi.fn(() => ({
    getSettings: vi.fn(() => ({})),
    runTask: vi.fn()
  }))
}))

describe('IPC updates channels', () => {
  beforeEach(() => {
    handleMock.mockReset()
  })

  it('wires update status and actions through update service', async () => {
    const { registerIpcHandlers } = await import('../src/main/ipc')
    const updateService = {
      reschedule: vi.fn(),
      getStatus: vi.fn(() => ({ checking: false })),
      checkForUpdates: vi.fn(async () => ({ checking: false, updateAvailable: false })),
      ignoreVersion: vi.fn(async () => ({ ignoredVersion: '1.2.3' })),
      dismissVersion: vi.fn(async () => ({ dismissedVersion: '1.2.3' })),
      openReleasePage: vi.fn(async () => ({ success: true, url: 'https://example.com' }))
    }
    const manager = {
      disconnectAll: vi.fn(),
      disconnect: vi.fn(),
      testConnection: vi.fn(),
      connect: vi.fn(),
      isConnected: vi.fn(),
      query: vi.fn(),
      getDatabases: vi.fn(),
      getTables: vi.fn(),
      getColumns: vi.fn(),
      getForeignKeys: vi.fn(),
      getProcedures: vi.fn(),
      getServerVersion: vi.fn()
    }

    registerIpcHandlers(manager as never, updateService as never)

    const handlers = Object.fromEntries(
      handleMock.mock.calls.map(([channel, fn]: [string, (...args: unknown[]) => Promise<unknown>]) => [channel, fn])
    )
    const trustedEvent = {
      senderFrame: {
        url: pathToFileURL(path.resolve(__dirname, '../src/renderer/index.html')).toString()
      }
    }

    expect(await handlers['updates:get-status'](trustedEvent)).toEqual({ checking: false })
    expect(await handlers['updates:check-now'](trustedEvent)).toEqual({ checking: false, updateAvailable: false })
    expect(await handlers['updates:ignore-version'](trustedEvent, '1.2.3')).toEqual({ ignoredVersion: '1.2.3' })
    expect(await handlers['updates:dismiss-version'](trustedEvent, '1.2.3')).toEqual({ dismissedVersion: '1.2.3' })
    expect(await handlers['updates:open-release'](trustedEvent, 'https://example.com')).toEqual({
      success: true,
      url: 'https://example.com'
    })

    expect(updateService.checkForUpdates).toHaveBeenCalledWith(true)
    expect(updateService.ignoreVersion).toHaveBeenCalledWith('1.2.3')
    expect(updateService.dismissVersion).toHaveBeenCalledWith('1.2.3')
    expect(updateService.openReleasePage).toHaveBeenCalledWith('https://example.com')
  })
})
