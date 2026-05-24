import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const titlebarCropViewBox = '105 55 250 250'
const assetsDir = 'src/renderer/src/assets/brand'

const jobs = [
  {
    input: `${assetsDir}/kobeansql-logo-lockup-light.svg`,
    output: `${assetsDir}/kobeansql-logo-titlebar-light.svg`
  },
  {
    input: `${assetsDir}/kobeansql-logo-lockup-dark.svg`,
    output: `${assetsDir}/kobeansql-logo-titlebar-dark.svg`
  }
]

function cropSvg(inputPath, outputPath) {
  const input = readFileSync(inputPath, 'utf8')
  const output = input.replace(/<svg\b([^>]*)>/, (match) => {
    return match
      .replace(/\swidth="[^"]*"/, ' width="600"')
      .replace(/\sheight="[^"]*"/, ' height="600"')
      .replace(/\sviewBox="[^"]*"/, ` viewBox="${titlebarCropViewBox}"`)
      .replace(/\spreserveAspectRatio="[^"]*"/, ' preserveAspectRatio="xMidYMid meet"')
  })

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, output)
}

for (const job of jobs) {
  cropSvg(resolve(repoRoot, job.input), resolve(repoRoot, job.output))
  console.log(`cropped ${job.output}`)
}
