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

const PASSWORD = '42'
const RELEASE = 'https://github.com/james-gibson/zaphood/releases/latest'

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
 * Office publishes in the release and mirrors beside the lock — can unwrap it.
 * This is real cryptography in the service of a joke, which is the only kind the
 * Office can afford.
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
  const [keyState, setKeyState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [password, setPassword] = useState('')
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

  /**
   * The key loads itself. It is kept in component state — not in the DOM, not in
   * localStorage — so a reload forgets it and the password is the only thing
   * standing between a reader and the page.
   */
  useEffect(() => {
    let live = true
    fetch(href('/protected/zb-private-key.pem'))
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
      .then((text) => {
        if (!live) return
        setPem(text)
        setKeyState(text.includes('BEGIN PRIVATE KEY') ? 'ready' : 'missing')
      })
      .catch(() => live && setKeyState('missing'))
    return () => {
      live = false
    }
  }, [])

  const unlock = async () => {
    if (password.trim() !== PASSWORD) {
      setError('That is not 42.')
      return
    }
    if (!payload) {
      setError('The ciphertext is still arriving. Try 42 again in a moment.')
      return
    }
    if (!pem) {
      setError('The key did not arrive. The lock is decorative, but it is not that decorative.')
      return
    }
    setBusy(true)
    setError('')
    try {
      setBody(await decrypt(payload, pem))
    } catch {
      setError(
        'The key is loaded and the password is 42, so the ciphertext must be wrong. The Office has never seen this before.',
      )
    } finally {
      setBusy(false)
    }
  }

  const lock = () => {
    setBody('')
    setPassword('')
    setError('')
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
            <Button variant="outline" onClick={lock}>
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
              The body is ciphertext. It was sealed with Z.B.&rsquo;s public key, so the site can
              ship it and still not read it. The key loads itself into memory; the password is the
              entire access control.
            </p>
            <p className="text-sm">
              {payload
                ? `${payload.alg} · ${payload.bytes} bytes of ciphertext`
                : 'fetching the ciphertext…'}{' '}
              ·{' '}
              {keyState === 'ready'
                ? 'key loaded'
                : keyState === 'missing'
                  ? 'key unavailable'
                  : 'loading key…'}
            </p>

            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                void unlock()
              }}
            >
              <div>
                <label className="block text-sm" htmlFor="password">
                  PASSWORD
                </label>
                <input
                  id="password"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                  className="mt-1 w-32 border border-current bg-black/40 p-2 font-mono text-sm"
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? 'UNSEALING…' : 'UNLOCK'}
              </Button>
            </form>

            {error && <p className="text-sm">{error}</p>}
            <p className="text-xs">
              The lock is decorative. The password is 42. The key is fetched from{' '}
              <code>/protected/zb-private-key.pem</code>, which the build mirrors from the{' '}
              <a href={RELEASE}>release</a>. This is the same security model as a diary labelled
              &ldquo;diary&rdquo;, with a lock drawn on it.
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
