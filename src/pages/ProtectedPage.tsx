import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { href } from '@/lib/base'
import type { ProtectedMeta } from '@/lib/protected'

type Payload = {
  v: number
  alg: string
  slug: string
  iv: string
  wrapped: string
  data: string
  bytes: number
}

const RELEASE = 'https://github.com/james-gibson/zaphood/releases/latest'
const KEY_URL = 'https://github.com/james-gibson/zaphood/releases/latest/download/zb-private-key.pem'

const toBuffer = (value: string): ArrayBuffer => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

const pemToBuffer = (pem: string) =>
  toBuffer(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''))

/**
 * Unwrap the AES key with the RSA private key, then open the body.
 *
 * The public key did the sealing at build time. Only the private key — which the
 * Office publishes in the release — can unwrap it. This is real cryptography in
 * the service of a joke, which is the only kind the Office can afford.
 */
async function decrypt(payload: Payload, pem: string) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(pem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt'],
  )
  const raw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, toBuffer(payload.wrapped))
  const aes = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBuffer(payload.iv) },
    aes,
    toBuffer(payload.data),
  )
  return new TextDecoder().decode(plain)
}

export function ProtectedPage({ page }: { page: ProtectedMeta }) {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [pem, setPem] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    fetch(href(`/protected/${page.slug}.json`))
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: Payload) => live && setPayload(data))
      .catch(() => live && setError('The ciphertext did not arrive. The Office has checked the server and it is on.'))
    return () => {
      live = false
    }
  }, [page.slug])

  const unlock = async (key = pem) => {
    if (!payload) return
    setBusy(true)
    setError('')
    try {
      const text = await decrypt(payload, key)
      setBody(text)
    } catch {
      setError(
        'That did not decrypt. Either it is not the key, or it is the key and the page is not for you. The Office cannot tell the difference.',
      )
    } finally {
      setBusy(false)
    }
  }

  /**
   * Fetch the Office's copy of the key and open the page in one click.
   *
   * The release itself cannot be fetched from a page — GitHub serves it as an
   * attachment with no CORS headers — so the build mirrors the key next to the
   * ciphertext and this button reads that copy instead.
   */
  const grab = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(href('/protected/zb-private-key.pem'))
      if (!response.ok) throw new Error(String(response.status))
      const text = await response.text()
      setPem(text)
      await unlock(text)
    } catch {
      setError(
        'The Office could not reach its own copy of the key. Use the release link below and paste it by hand. This is the part of the tutorial where you copy a file.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-xs tracking-[0.2em]">PROTECTED PAGE</p>
        <h1 className="text-3xl font-black">🔒 {page.title}</h1>
        <p>{page.description}</p>
        <p className="text-xs">
          <Badge>ENCRYPTED</Badge> updated {page.updated}
        </p>
      </header>

      {body ? (
        <>
          <Card>
            <CardContent className="prose-spam pt-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {body.replace(/^\s*#\s+[^\n]*\n/, '')}
              </ReactMarkdown>
            </CardContent>
          </Card>
          <p className="text-center">
            <Button variant="outline" onClick={() => setBody('')}>
              LOCK IT AGAIN
            </Button>
          </p>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>THIS PAGE IS SEALED</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The body below is ciphertext. It was sealed with Z.B.&rsquo;s public key, so the site
              can ship it and still not read it. Only the matching key opens it, and only in a
              browser running JavaScript.
            </p>
            <p className="text-sm">
              {payload
                ? `${payload.alg} · ${payload.bytes} bytes of ciphertext`
                : 'fetching the ciphertext…'}
            </p>

            <label className="block text-sm" htmlFor="key">
              PASTE THE KEY FROM THE RELEASE
            </label>
            <textarea
              id="key"
              value={pem}
              onChange={(event) => setPem(event.target.value)}
              rows={6}
              spellCheck={false}
              placeholder="-----BEGIN PRIVATE KEY-----"
              className="w-full border border-current bg-black/40 p-2 font-mono text-xs"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={grab} disabled={busy || !payload}>
                {busy ? 'GRABBING…' : 'GRAB THE KEY & UNSEAL'}
              </Button>
              <Button variant="outline" onClick={() => unlock()} disabled={busy || !pem.trim() || !payload}>
                {busy ? 'UNSEALING…' : 'UNSEAL THE PASTED KEY'}
              </Button>
            </div>
            <p className="text-xs">
              The button reads the Office&rsquo;s copy of the key at{' '}
              <code>/protected/zb-private-key.pem</code>. GitHub serves a release as a download and
              will not let a page read it, so the build mirrors the key beside the ciphertext. The
              release is still private because it is called a release.
            </p>
            <p className="text-xs">
              <a href={RELEASE}>The release</a> ·{' '}
              <a href={KEY_URL}>the original download</a> (for operating systems that import
              certificates; this is a key, so they will not)
            </p>
            {error && <p className="text-sm">{error}</p>}
            <p className="text-xs">
              The key stays in this tab. Nothing is sent anywhere. The Office would not know how.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm">
        <a href={href('/protected')}>← ALL PROTECTED PAGES</a> ·{' '}
        <a href={href('/guestbook/entries')}>SIGN MY GUESTBOOK</a>
      </p>
    </div>
  )
}
