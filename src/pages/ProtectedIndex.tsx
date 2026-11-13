import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { href } from '@/lib/base'
import { PROTECTED, protectedRoute } from '@/lib/protected'

export function ProtectedIndex() {
  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-black">PROTECTED PAGES</h1>
        <p>
          These pages are <strong>encrypted</strong> with Z.B.&rsquo;s public key. Reading them
          requires JavaScript running in your browser and the matching key.
        </p>
        <p className="text-sm">
          <Badge>ENCRYPTED</Badge> the titles are public. The bodies are not. This is called a
          threat model.
        </p>
      </header>

      <div className="grid gap-4">
        {PROTECTED.map((page) => (
          <Card key={page.slug}>
            <CardHeader>
              <CardTitle>
                🔒 {page.title}{' '}
                <span className="text-xs font-normal">({page.updated})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>{page.description}</p>
              <p>
                <a href={href(protectedRoute(page.slug))}>CLICK HERE TO UNLOCK →</a>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WHERE IS THE KEY?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            The key is published in the{' '}
            <a href="https://github.com/james-gibson/zaphood/releases/latest">
              release
            </a>
            . The release is private because it is called a release.
          </p>
          <p className="text-sm">
            Download <code>zb-private-key.pem</code>, open a protected page, and paste it into the
            box. The key never leaves your browser; the page is decrypted in memory and forgotten
            when you close the tab.
          </p>
          <p className="text-sm">
            If you are reading this without JavaScript, you cannot read the pages. That is the
            protection. It is also the entire protection.
          </p>
          <p className="text-sm">
            The plaintext is in the repository, because the build needs it. The protection is
            against the reader, not the source. This is the same security model as a curtain.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
