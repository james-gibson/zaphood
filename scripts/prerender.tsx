/**
 * Render every route to static HTML. The shell is the app with the markup in
 * #root, so a reader without JavaScript gets the page and the browser replaces
 * it on load. Same pattern as the parent seed.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { renderToString } from 'react-dom/server'
import { App } from '../src/App'
import { PAGES, SECTIONS } from '../src/lib/content'
import { PROTECTED } from '../src/lib/protected'

const OUT = 'dist/.prerender'

const routes = [
  { key: 'home', path: '/' },
  ...SECTIONS.map((section) => ({ key: section.id, path: `/${section.id}` })),
  ...PAGES.map((page) => ({
    key: `${page.section}/${page.slug}`.replace(/\//g, '__'),
    path: `/${page.section}/${page.slug}`,
  })),
  { key: 'protected', path: '/protected' },
  ...PROTECTED.map((page) => ({ key: `protected__${page.slug}`, path: `/protected/${page.slug}` })),
  { key: '404', path: '/this-route-does-not-exist' },
]

await mkdir(OUT, { recursive: true })

let failures = 0
for (const route of routes) {
  try {
    const html = renderToString(<App path={route.path} />)
    await writeFile(join(OUT, `${route.key}.html`), html, 'utf8')
  } catch (error) {
    failures += 1
    console.error(`prerender: ${route.path} failed — ${(error as Error).message}`)
  }
}

if (failures) {
  console.error(`prerender: ${failures} of ${routes.length} routes failed`)
  process.exit(1)
}

console.log(`prerender: ${routes.length} routes rendered`)
