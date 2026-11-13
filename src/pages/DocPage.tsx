import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { sectionMeta, type Page } from '@/lib/content'
import { href } from '@/lib/base'

export function DocPage({ page }: { page: Page }) {
  const meta = sectionMeta(page.section)
  return (
    <article className="space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-xs tracking-[0.2em]">SECTION: {meta.label.toUpperCase()}</p>
        <h1 className="text-3xl font-black">{page.title}</h1>
        <p>{page.description}</p>
        <p className="text-xs">
          <Badge>{page.stage.toUpperCase()}</Badge> updated {page.updated}
        </p>
      </header>

      <Card>
        <CardContent className="prose-spam pt-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body.replace(/^\s*#\s+[^\n]*\n/, '')}</ReactMarkdown>
        </CardContent>
      </Card>

      <p className="text-center text-sm">
        <a href={href(`/${page.section}`)}>← BACK TO {meta.label.toUpperCase()}</a> ·{' '}
        <a href={href('/guestbook/entries')}>SIGN MY GUESTBOOK</a>
      </p>
    </article>
  )
}
