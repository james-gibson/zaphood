/** One page = one file. The path is the URL; the nav is derived. */
export type SectionId = 'about' | 'guestbook' | 'links' | 'awards'

export const SECTIONS: { id: SectionId; label: string; blurb: string }[] = [
  { id: 'about', label: 'About', blurb: 'The Office, and the initials it publishes for security.' },
  { id: 'guestbook', label: 'Guestbook', blurb: 'Sign it. Everyone is doing it.' },
  { id: 'links', label: 'Links', blurb: 'The webring, the toolbar, and other essential downloads.' },
  { id: 'awards', label: 'Awards', blurb: 'Awards the Office gave itself, displayed with gravity.' },
]

export type Page = {
  path: string
  section: SectionId
  slug: string
  title: string
  description: string
  order: number
  updated: string
  stage: string
  body: string
  headings: { id: string; text: string }[]
}

const rawFiles = import.meta.glob('../content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const field = (frontmatter: string, name: string) =>
  new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? ''

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

function toPage(path: string, source: string): Page | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  const frontmatter = match?.[1] ?? ''
  const body = source.slice(match?.[0].length ?? 0).trim()
  const relativePath = path.replace('../content/', '').replace(/\.md$/, '')
  const [section, slug] = relativePath.split('/')
  if (!section || !slug) return null
  return {
    path: relativePath,
    section: section as SectionId,
    slug,
    title: field(frontmatter, 'title'),
    description: field(frontmatter, 'description'),
    order: Number(field(frontmatter, 'order')) || 99,
    updated: field(frontmatter, 'updated'),
    stage: field(frontmatter, 'stage') || 'standing',
    body,
    headings: [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => ({
      id: slugify(m[1]),
      text: m[1],
    })),
  }
}

export const PAGES: Page[] = Object.entries(rawFiles)
  .map(([path, source]) => toPage(path, source))
  .filter((page): page is Page => page !== null)
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

export const pagesIn = (section: SectionId) => PAGES.filter((page) => page.section === section)

export const getPage = (section: string, slug: string) =>
  PAGES.find((page) => page.section === section && page.slug === slug)

export const sectionMeta = (id: SectionId) => SECTIONS.find((section) => section.id === id)!

export const routeOf = (page: Page) => `/${page.section}/${page.slug}`

export const latestUpdate = () =>
  PAGES.map((page) => page.updated).filter(Boolean).sort().at(-1) ?? 'unknown'
