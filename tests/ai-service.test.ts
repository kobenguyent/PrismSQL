import { describe, expect, it, vi } from 'vitest'

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    transports: { file: { level: 'info', getFile: vi.fn(() => ({ path: '/tmp/kobeansql.log' })) } }
  }
}))

import { createLocalAIService } from '../src/main/ai/service'
import { OllamaService } from '../src/main/ai/ollama'
import { OpenAICompatibleService } from '../src/main/ai/openai-compatible'

describe('local AI service selection', () => {
  it('defaults to Ollama provider', () => {
    const service = createLocalAIService()
    expect(service.getSettings().provider).toBe('ollama')
  })

  it('supports OpenAI-compatible local provider', () => {
    const service = createLocalAIService('openai-compatible')
    expect(service.getSettings().provider).toBe('openai-compatible')
  })

  it('falls back to Ollama for unknown provider', () => {
    const service = createLocalAIService('unknown-provider')
    expect(service.getSettings().provider).toBe('ollama')
  })
})

describe('local-only URL policy', () => {
  it('rejects non-local Ollama URLs', async () => {
    const service = new OllamaService('https://example.com', 'llama3.1')
    const result = await service.runTask({ task: 'generate', prompt: 'list users' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('local-only policy')
  })

  it('rejects non-local OpenAI-compatible URLs', async () => {
    const service = new OpenAICompatibleService('https://api.openai.com/v1', 'gpt-local')
    const result = await service.runTask({ task: 'generate', prompt: 'list users' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('local-only policy')
  })
})
