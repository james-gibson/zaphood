#!/usr/bin/env node
/**
 * Shells, 404, robots, sitemap and llms.txt — everything Pages needs and Vite
 * does not know about. The route list is derived from the content tree.
 */
import { access, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const SITE = 'https://james-gibson.github.io/zaphood'
const DIST = 'dist'
const CONTENT = 'src/content'
const index = join(DIST, 'index.html')

try {
  await access(index)
} catch {
  console.error('postbuild: dist/index.html is missing — run vite build first')
  process.exit(1)
}

const walk = async (dir) => {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

const sections = (await readdir(CONTENT, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const pages = await Promise.all(
  (await walk(CONTENT))
  .filter((file) => file.endsWith('.md'))
  .map(async (file) => {
    const source = await readFile(file, 'utf8')
    const route = relative(CONTENT, file).replace(/\.md$/, '')
    const field = (name) =>
      new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(source)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? ''
    return { route, title: field('title'), description: field('description'), order: Number(field('order')) || 99 }
  }),
)

const routes = [...sections, ...pages.map((page) => page.route)]
const template = await readFile(index, 'utf8')
const PRERENDER = join(DIST, '.prerender')
const markup = new Map()
try {
  for (const file of await readdir(PRERENDER)) {
    markup.set(file.replace(/\.html$/, ''), await readFile(join(PRERENDER, file), 'utf8'))
  }
} catch {
  console.warn('postbuild: no prerendered markup — shells will be empty')
}

const shell = (key, title) => {
  const content = markup.get(key)
  const html = content
    ? template.replace('<div id="root"></div>', `<div id="root">${content}</div>`)
    : template
  return title ? html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title} · The Office of Z.B.</title>`) : html
}

for (const route of routes) {
  const dir = join(DIST, route)
  await mkdir(dir, { recursive: true })
  const title = pages.find((page) => page.route === route)?.title ?? route.charAt(0).toUpperCase() + route.slice(1)
  await writeFile(join(dir, 'index.html'), shell(route.replace(/\//g, '__'), title), 'utf8')
}

await writeFile(join(DIST, 'index.html'), shell('home', null), 'utf8')
await writeFile(join(DIST, '404.html'), shell('404', 'Not found'), 'utf8')
await writeFile(join(DIST, '.nojekyll'), '')

const urls = ['', ...routes.map((route) => `${route}/`)]
await writeFile(
  join(DIST, 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${url ? `${SITE}/${url}` : `${SITE}/`}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n'),
  'utf8',
)

await writeFile(
  join(DIST, 'robots.txt'),
  ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE}/sitemap.xml`, ''].join('\n'),
  'utf8',
)

const bySection = sections.map((section) => ({
  section,
  pages: pages.filter((page) => page.route.startsWith(`${section}/`)).sort((a, b) => a.order - b.order),
}))

const llms = [
  '# The Office of Z.B.',
  '',
  'A research team studies economic questions by running them as OpenTTD simulations.',
  'One page per file, navigation derived from the content tree.',
  '',
  '## Commands',
  '',
  '- `npm install`',
  '- `npm run dev`',
  '- `npm run build` — type-check, bundle, prerender, shells, llms.txt, guard',
  '- `npm run guard`',
  '',
  '## Pages',
  '',
  ...bySection.flatMap(({ section, pages: list }) => [
    `### ${section}`,
    '',
    ...list.map((page) => `- [${page.title}](${SITE}/${page.route}/): ${page.description}`),
    '',
  ]),
  '## Invariants',
  '',
  '- The path is the URL.',
  '- Navigation is derived; there is no nav array.',
  '- Content is Markdown, never MDX.',
  '- The guard is the gate: a broken link or a missing shell stops the publish.',
  '',
].join('\n')
await writeFile(join(DIST, 'llms.txt'), llms, 'utf8')

// --- rules.md: what this child actually follows ---------------------------
// The upstream list, verbatim, plus the overrides this child has recorded. A
// reader can see which rules are inherited and which are replaced.
const upstream = await readFile('upstream/rules.md', 'utf8').catch(() => '')
const overrides = await readFile('upstream/overrides.md', 'utf8').catch(() => '')
if (upstream) {
  await writeFile(
    join(DIST, 'rules.md'),
    `${upstream}\n## Local overrides\n\n${overrides.replace(/^# Local overrides\n+/, '')}`,
    'utf8',
  )
}

await rm(PRERENDER, { recursive: true, force: true })
console.log(`postbuild: ${routes.length} shells, 404, sitemap, robots, llms.txt (${pages.length} pages)`)
