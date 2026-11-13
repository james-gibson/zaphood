import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { pagesIn } from '@/lib/content'
import { PROTECTED, protectedRoute } from '@/lib/protected'
import { href } from '@/lib/base'

export function Home() {
  const awards = pagesIn('awards')
  const guestbook = pagesIn('guestbook')
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">WELCOME, IMPORTANT VISITOR!!!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-base">
          <p>
            You have reached the OFFICIAL homepage of <strong>THE OFFICE OF Z.B.</strong> This office
            exists to serve one person: <strong>YOU</strong>. You are important. You have always been
            important. The Office has been saying so since 1998.
          </p>
          <p>
            There is no login. There is no checkout. There is only this homepage and the guestbook,
            which is under construction.
          </p>
          <p>
            <Button asChild size="lg">
              <a href={href('/guestbook/entries')}>SIGN MY GUESTBOOK!!!</a>
            </Button>
          </p>
        </CardContent>
      </Card>

      <div className="construction">🚧 SITE UNDER CONSTRUCTION SINCE 1998 🚧</div>

      <Card>
        <CardHeader>
          <CardTitle>LATEST NEWS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            <Badge>NEW!</Badge> The Office has won another award. It was awarded by the Office.{' '}
            <a href={href('/awards/awards')}>See the awards page</a>.
          </p>
          <p>
            <Badge variant="secondary">UPDATE</Badge> The guestbook now has {guestbook.length} page of
            entries, which is one page. <a href={href('/guestbook/entries')}>Read it</a>.
          </p>
          <p>
            <Badge variant="destructive">URGENT</Badge> The Office still does not know what it is
            doing. This is unchanged.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AWARDS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>🏆 BEST HOMEPAGE (1998) — awarded by the Office</p>
          <p>🏆 MOST IMPORTANT VISITOR — awarded to you</p>
          <p>🏆 STILL ONLINE (2026) — awarded by the Office</p>
          <p className="text-sm">
            <a href={href('/awards/awards')}>All {awards.length} award page</a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PROTECTED PAGES</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            {PROTECTED.length} pages are encrypted with Z.B.&rsquo;s public key. You will need
            JavaScript and the key from the release. The release is private because it is called a
            release.
          </p>
          <ul className="space-y-1">
            {PROTECTED.map((page) => (
              <li key={page.slug}>
                🔒 <a href={href(protectedRoute(page.slug))}>{page.title}</a> — {page.description}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>COOL LINKS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <a href={href('/links/cool-links')}>MY WEBRING</a> ·{' '}
            <a href={href('/links/cool-links')}>DOWNLOAD MY TOOLBAR</a> ·{' '}
            <a href={href('/links/cool-links')}>MY ICQ NUMBER</a>
          </p>
          <p className="text-sm">All three links go to the same page. This is normal.</p>
        </CardContent>
      </Card>
    </div>
  )
}
