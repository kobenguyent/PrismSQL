import { appLogger } from '../logger'

export type AITaskType = 'generate' | 'explain' | 'optimize'

export interface AIRequest {
  task: AITaskType
  prompt?: string
  sql?: string
  dbType?: string
}

export interface AIResponse {
  success: boolean
  output?: string
  error?: string
}

export class OllamaService {
  private readonly baseUrl: string
  private readonly model: string

  constructor(baseUrl = process.env.PRISMSQL_OLLAMA_URL ?? 'http://127.0.0.1:11434', model = process.env.PRISMSQL_OLLAMA_MODEL ?? 'llama3.1') {
    this.baseUrl = baseUrl
    this.model = model
  }

  getSettings(): { provider: 'ollama'; baseUrl: string; model: string; localOnly: true } {
    return { provider: 'ollama', baseUrl: this.baseUrl, model: this.model, localOnly: true }
  }

  async runTask(request: AIRequest): Promise<AIResponse> {
    const prompt = this.buildPrompt(request)
    if (!prompt) {
      return { success: false, error: 'Invalid AI request' }
    }

    try {
      appLogger.info('Running AI task with local Ollama', { task: request.task, model: this.model })
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false
        })
      })

      if (!response.ok) {
        const text = await response.text()
        appLogger.error('Ollama request failed', { status: response.status, text })
        return { success: false, error: `Ollama error (${response.status})` }
      }

      const payload = (await response.json()) as { response?: string }
      const output = payload.response?.trim()
      if (!output) {
        return { success: false, error: 'Empty response from Ollama' }
      }
      return { success: true, output }
    } catch (error) {
      appLogger.error('Failed to call local Ollama', { error: (error as Error).message })
      return {
        success: false,
        error:
          'Unable to reach local Ollama. Make sure Ollama is running locally (default: http://127.0.0.1:11434).'
      }
    }
  }

  private buildPrompt(request: AIRequest): string | null {
    const dbType = request.dbType ?? 'sql'
    const policy = 'PrismSQL policy: local AI only, no telemetry, no cloud providers.'
    switch (request.task) {
      case 'generate':
        if (!request.prompt?.trim()) return null
        return [
          policy,
          `Generate ${dbType} SQL only.`,
          'Return SQL only without markdown fences.',
          `User request: ${request.prompt.trim()}`
        ].join('\n')
      case 'explain':
        if (!request.sql?.trim()) return null
        return [
          policy,
          `Explain the following ${dbType} SQL clearly and concisely.`,
          'Keep explanation under 10 bullet points.',
          request.sql.trim()
        ].join('\n')
      case 'optimize':
        if (!request.sql?.trim()) return null
        return [
          policy,
          `Optimize the following ${dbType} SQL for performance and clarity.`,
          'Return only the improved SQL without markdown fences.',
          request.sql.trim()
        ].join('\n')
      default:
        return null
    }
  }
}
