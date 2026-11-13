#!/usr/bin/env node
/**
 * The protected pages' public half: slugs, titles and descriptions.
 *
 * The bodies live in `private/pages/` and are never imported by the app. This
 * manifest is what the build, the prerenderer and the browser are allowed to
 * know before a key is supplied.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SOURCE = 'private/pages'
const OUT = 'protected/manifest.json'

const field = (frontmatter, name) =>
  new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? ''

const files = (await readdir(SOURCE)).filter((file) => file.endsWith('.md')).sort()
const pages = []

for (const file of files) {
  const source = await readFile(join(SOURCE, file), 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  const frontmatter = match?.[1] ?? ''
  pages.push({
    slug: file.replace(/\.md$/, ''),
    title: field(frontmatter, 'title'),
    description: field(frontmatter, 'description'),
    updated: field(frontmatter, 'updated'),
    stage: field(frontmatter, 'stage') || 'sealed',
  })
}

if (!pages.length) {
  console.error(`protected-manifest: no pages in ${SOURCE}/`)
  process.exit(1)
}

await mkdir('protected', { recursive: true })
await writeFile(OUT, `${JSON.stringify({ pages }, null, 2)}\n`, 'utf8')
console.log(`protected-manifest: ${pages.length} pages — ${pages.map((page) => page.slug).join(', ')}`)
