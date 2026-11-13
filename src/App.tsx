import { Layout } from '@/components/Layout'
import { DocPage } from '@/pages/DocPage'
import { Home } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound'
import { ProtectedIndex } from '@/pages/ProtectedIndex'
import { ProtectedPage } from '@/pages/ProtectedPage'
import { SectionIndex } from '@/pages/SectionIndex'
import { getPage, SECTIONS, type SectionId } from '@/lib/content'
import { getProtected } from '@/lib/protected'

const isSection = (value: string): value is SectionId =>
  SECTIONS.some((section) => section.id === value)

/**
 * No router. Every link is a real URL and every route has its own shell, so the
 * page to render is decided by the path the build (or the browser) hands in.
 */
export function App({ path }: { path: string }) {
  const clean = path.replace(/\/+$/, '') || '/'
  const [, section, slug] = clean.split('/')

  let content = <NotFound />
  if (clean === '/') content = <Home />
  else if (section === 'protected' && !slug) content = <ProtectedIndex />
  else if (section === 'protected' && slug) {
    const page = getProtected(slug)
    if (page) content = <ProtectedPage page={page} />
  } else if (section && !slug && isSection(section)) content = <SectionIndex section={section} />
  else if (section && slug && isSection(section)) {
    const page = getPage(section, slug)
    if (page) content = <DocPage page={page} />
  }

  return <Layout path={clean}>{content}</Layout>
}
