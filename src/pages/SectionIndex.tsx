import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { pagesIn, sectionMeta, type SectionId } from '@/lib/content'
import { href } from '@/lib/base'

export function SectionIndex({ section }: { section: SectionId }) {
  const meta = sectionMeta(section)
  const pages = pagesIn(section)
  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-black">{meta.label.toUpperCase()}</h1>
        <p>{meta.blurb}</p>
      </header>

      <div className="grid gap-4">
        {pages.map((page) => (
          <Card key={page.path}>
            <CardHeader>
              <CardTitle>{page.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>{page.description}</p>
              <p>
                <a href={href(`/${page.section}/${page.slug}`)}>CLICK HERE →</a>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
