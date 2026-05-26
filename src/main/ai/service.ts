import { appLogger } from '../logger'
import { OllamaService } from './ollama'
import { OpenAICompatibleService } from './openai-compatible'
import type { LocalAIService } from './types'

export function createLocalAIService(
  provider = process.env.KOBEANSQL_AI_PROVIDER,
  baseUrl?: string,
  model?: string
): LocalAIService {
  switch (provider?.trim().toLowerCase()) {
    case undefined:
    case '':
    case 'ollama':
      return new OllamaService(baseUrl, model)
    case 'openai-compatible':
    case 'openai_compatible':
    case 'openai':
      return new OpenAICompatibleService(baseUrl, model)
    default:
      appLogger.warn('Unknown local AI provider; falling back to Ollama', { provider })
      return new OllamaService(baseUrl, model)
  }
}
