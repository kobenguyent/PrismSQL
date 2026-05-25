import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const readmePath = path.join(repoRoot, 'README.md')
const pagesPath = path.join(repoRoot, 'docs', 'index.html')
const checksPath = path.join(__dirname, 'docs-sync-checks.json')

const readme = fs.readFileSync(readmePath, 'utf-8')
const pages = fs.readFileSync(pagesPath, 'utf-8')
const checkConfigs = JSON.parse(fs.readFileSync(checksPath, 'utf-8'))

const checks = checkConfigs.map((check) => {
  const flags = check.flags ?? 'i'
  const readmeRegex = new RegExp(check.readme, flags)
  const pagesRegex = new RegExp(check.pages, flags)
  const inReadme = readmeRegex.test(readme)
  const inPages = pagesRegex.test(pages)
  return { ...check, inReadme, inPages }
})

const failures = checks.filter((check) => !check.inReadme || !check.inPages)

if (failures.length > 0) {
  console.error('README.md and docs/index.html are out of sync for the following required topics:')
  for (const failure of failures) {
    console.error(`- ${failure.name} (README: ${failure.inReadme ? 'ok' : 'missing'}, docs: ${failure.inPages ? 'ok' : 'missing'})`)
  }
  process.exit(1)
}

console.log('README.md and docs/index.html are in sync for required product topics.')
