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
 *   node scripts/sync-upstream.mjs           # re-vendor, then commit
 *   node scripts/sync-upstream.mjs --check   # catch-up check; writes nothing
 *
 * `--check` is the same fetch without the write. It is the seed's catch-up
 * step: CI runs it before `npm run build`, so a cycle that would deploy against
 * an out-of-date rule list refuses to deploy and names what is missing. It
 * never mutates, because the build has to stay reproducible from the checkout
 * alone — the rule arrives as a commit, not as a network read.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const SOURCE = 'https://james-gibson.github.io/le.gume/rules.md'
const OUT = 'upstream/rules.md'
const MANIFEST = 'upstream/manifest.json'
const OVERRIDES = 'upstream/overrides.md'

const check = process.argv.includes('--check')

const response = await fetch(SOURCE).catch((error) => {
  console.error(`rules: could not read ${SOURCE} — ${error.message}`)
  console.error('rules: a release that cannot read its rules cannot claim to follow them')
  process.exit(1)
})
if (!response.ok) {
  console.error(`rules: ${SOURCE} answered ${response.status}`)
  console.error('rules: a release that cannot read its rules cannot claim to follow them')
  process.exit(1)
}

const text = await response.text()
if (!/^version: \S+/m.test(text) || !/RULES-01:/.test(text)) {
  console.error('rules: the fetched file does not look like rules.md')
  process.exit(1)
}

const ruleIds = (source) => [...source.matchAll(/^- (RULES-\d+):/gm)].map((match) => match[1])
const version = /^version: (\S+)/m.exec(text)?.[1] ?? 'unknown'
const sha256 = createHash('sha256').update(text).digest('hex')
const ids = ruleIds(text)

if (check) {
  const local = await readFile(OUT, 'utf8').catch(() => null)
  if (!local) {
    console.error(`rules: ${OUT} is missing — run \`npm run sync\` and commit it`)
    process.exit(1)
  }

  const localVersion = /^version: (\S+)/m.exec(local)?.[1] ?? 'unknown'
  const localIds = ruleIds(local)
  // What decides is the rule lines, not the file bytes and not the version line:
  // le.gume sets `version:` to the commit it built from, so both move on every
  // content deploy even when no rule does. A child that failed on that would
  // never stop failing.
  const digest = (source) =>
    createHash('sha256')
      .update(source.split('\n').filter((line) => line.startsWith('- RULES-')).join('\n'))
      .digest('hex')
  const sameRules = digest(local) === digest(text)

  if (sameRules) {
    const overrides = (await readFile(OVERRIDES, 'utf8').catch(() => '')).match(
      /^- RULES-\d+:/gm,
    )?.length
    console.log(
      `rules: following le.gume ${version} — ${localIds.length} rules, ${overrides ?? 0} override(s)`,
    )
    if (localVersion !== version) {
      console.log(
        `rules: text unchanged since ${localVersion}; the version line tracks the parent's commit, not its rules`,
      )
    }
    process.exit(0)
  }

  const added = ids.filter((id) => !localIds.includes(id))
  const dropped = localIds.filter((id) => !ids.includes(id))

  if (localVersion === version) {
    console.error(`rules: le.gume republished ${version} with different text — the version did not move`)
  } else {
    console.error(`rules: vendored ${localVersion}, published ${version} — this seed is behind`)
  }
  for (const id of added) console.error(`rules:   + ${id} ${(new RegExp(`^- ${id}: (.+)$`, 'm').exec(text)?.[1] ?? '').trim()}`)
  for (const id of dropped) console.error(`rules:   - ${id}  (an override naming it must be retracted)`)
  console.error(`rules: run \`npm run sync\`, review the diff in ${OUT}, commit it, and rebuild`)
  process.exit(1)
}

await mkdir('upstream', { recursive: true })
await writeFile(OUT, text, 'utf8')

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
  `sync: ${version} (${sha256.slice(0, 12)})${changed ? ` — was ${previous.version}` : ''}, ${ids.length} rules`,
)
