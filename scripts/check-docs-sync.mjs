import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const readmePath = path.join(repoRoot, 'README.md')
const pagesPath = path.join(repoRoot, 'docs', 'index.html')

const readme = fs.readFileSync(readmePath, 'utf-8')
const pages = fs.readFileSync(pagesPath, 'utf-8')

const checks = [
  { name: 'MySQL support', readme: /\bMySQL\b/i, pages: /\bMySQL\b/i },
  { name: 'MariaDB support', readme: /\bMariaDB\b/i, pages: /\bMariaDB\b/i },
  { name: 'PostgreSQL support', readme: /\bPostgreSQL\b/i, pages: /\bPostgreSQL\b/i },
  { name: 'SQLite support', readme: /\bSQLite\b/i, pages: /\bSQLite\b/i },
  { name: 'SQL Server support', readme: /SQL Server/i, pages: /SQL Server/i },
  { name: 'Schema Visualizer', readme: /Schema Visualizer|Schema visualizer/i, pages: /Schema Visualizer/i },
  { name: 'Query History', readme: /Query history panel|Query History/i, pages: /Query History/i },
  { name: 'Connection import/export', readme: /Connection import\s*\/\s*export/i, pages: /Connection Import\/Export/i },
  { name: 'Configurable query limit', readme: /Configurable query limit/i, pages: /query row limits?/i },
  { name: 'Local-only AI', readme: /Local-only AI assistant/i, pages: /Local-Only AI Assistant/i },
  { name: 'Ollama provider', readme: /\bOllama\b/i, pages: /\bOllama\b/i },
  { name: 'OpenAI-compatible provider', readme: /OpenAI-compatible/i, pages: /OpenAI-compatible/i }
]

const failures = checks.filter((check) => !check.readme.test(readme) || !check.pages.test(pages))

if (failures.length > 0) {
  console.error('README.md and docs/index.html are out of sync for the following required topics:')
  for (const failure of failures) {
    const inReadme = failure.readme.test(readme)
    const inPages = failure.pages.test(pages)
    console.error(`- ${failure.name} (README: ${inReadme ? 'ok' : 'missing'}, docs: ${inPages ? 'ok' : 'missing'})`)
  }
  process.exit(1)
}

console.log('README.md and docs/index.html are in sync for required product topics.')
