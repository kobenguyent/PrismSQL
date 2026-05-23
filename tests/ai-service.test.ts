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
  it('returns provider-specific local URL examples for invalid URL values', async () => {
    const ollamaResult = await new OllamaService('not-a-url', 'llama3.1').runTask({
      task: 'generate',
      prompt: 'list users'
    })
    expect(ollamaResult.success).toBe(false)
    expect(ollamaResult.error).toContain('http://127.0.0.1:11434')

    const openaiResult = await new OpenAICompatibleService('not-a-url', 'gpt-local').runTask({
      task: 'generate',
      prompt: 'list users'
    })
    expect(openaiResult.success).toBe(false)
    expect(openaiResult.error).toContain('http://127.0.0.1:1234/v1')
  })

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
