#!/usr/bin/env node
/**
 * Fetch the upstream rules a child seed defers to.
 *
 * The rules are not copied into AGENTS.md: a copy drifts and nobody can tell
 * which one is current. This script vendors the file with its version and hash,
 * so the guard can prove the child is reading what the parent published, and
 * `upstream/overrides.md` records the rules this child has deliberately
 * replaced.
 *
 *   node scripts/sync-upstream.mjs
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const SOURCE = 'https://james-gibson.github.io/le.gume/rules.md'
const OUT = 'upstream/rules.md'
const MANIFEST = 'upstream/manifest.json'

const response = await fetch(SOURCE)
if (!response.ok) {
  console.error(`sync: ${SOURCE} answered ${response.status}`)
  process.exit(1)
}

const text = await response.text()
if (!/^version: \S+/m.test(text) || !/RULES-01:/.test(text)) {
  console.error('sync: the fetched file does not look like rules.md')
  process.exit(1)
}

await mkdir('upstream', { recursive: true })
await writeFile(OUT, text, 'utf8')

const version = /^version: (\S+)/m.exec(text)?.[1] ?? 'unknown'
const sha256 = createHash('sha256').update(text).digest('hex')

let previous = null
try {
  previous = JSON.parse(await readFile(MANIFEST, 'utf8'))
} catch {
  // First sync: no manifest yet.
}

await writeFile(
  MANIFEST,
  `${JSON.stringify({ source: SOURCE, version, sha256, fetchedAt: new Date().toISOString() }, null, 2)}\n`,
  'utf8',
)

const changed = previous && previous.version !== version
console.log(
  `sync: ${version} (${sha256.slice(0, 12)})${changed ? ` — was ${previous.version}` : ''}`,
)
