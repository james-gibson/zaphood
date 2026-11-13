#!/usr/bin/env node
/**
 * Encrypt the protected pages into the release.
 *
 * The body is sealed with a fresh AES-256-GCM key, and that key is wrapped with
 * Z.B.'s RSA public key. The site therefore ships ciphertext, and the only way
 * to read it is to run JavaScript with the matching private key — which the
 * Office publishes in the release, because the release is private.
 *
 * The plaintext stays in `private/pages/` and is never imported by the app, so
 * it cannot reach the bundle by accident.
 */
import { constants, createCipheriv, publicEncrypt, randomBytes } from 'node:crypto'
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SOURCE = 'private/pages'
const OUT = 'dist/protected'
const PUBLIC_KEY = 'keys/zb-public.pem'

try {
  await access(join('dist', 'index.html'))
} catch {
  console.error('protect: dist/index.html is missing — run vite build and postbuild first')
  process.exit(1)
}

const publicKey = await readFile(PUBLIC_KEY, 'utf8').catch(() => '')
if (!publicKey.includes('BEGIN PUBLIC KEY')) {
  console.error(`protect: ${PUBLIC_KEY} is missing or not a public key`)
  process.exit(1)
}

const files = (await readdir(SOURCE)).filter((file) => file.endsWith('.md')).sort()
if (!files.length) {
  console.error(`protect: no pages in ${SOURCE}/`)
  process.exit(1)
}

await mkdir(OUT, { recursive: true })

/**
 * The key the button fetches.
 *
 * A browser cannot read a release asset: GitHub answers the redirect without
 * CORS headers and serves the file as an attachment, so a page that fetches it
 * gets an opaque failure. The Office therefore mirrors the key beside the lock
 * at build time — from the local copy when there is one, from the release when
 * the build is running in CI. This is not a security improvement; the release
 * is public anyway. It is a convenience, which is the Office's favourite kind
 * of security.
 */
const KEY_URL =
  'https://github.com/james-gibson/zaphood/releases/latest/download/zb-private-key.pem'

let privateKey = await readFile('.private/zb-private.pem', 'utf8').catch(() => '')
let keySource = privateKey ? 'local' : ''
if (!privateKey.includes('BEGIN PRIVATE KEY')) {
  try {
    const response = await fetch(KEY_URL, { redirect: 'follow' })
    if (response.ok) {
      privateKey = await response.text()
      keySource = 'release'
    }
  } catch {
    // handled below
  }
}
if (privateKey.includes('BEGIN PRIVATE KEY')) {
  await writeFile(join(OUT, 'zb-private-key.pem'), privateKey, 'utf8')
  console.log(`protect: key mirrored from ${keySource}`)
} else {
  console.warn('protect: no private key to mirror — the unlock button will not work')
}

const index = []
for (const file of files) {
  const slug = file.replace(/\.md$/, '')
  const source = await readFile(join(SOURCE, file), 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source)
  const body = source.slice(match?.[0].length ?? 0).trim()

  const key = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const sealed = Buffer.concat([cipher.update(body, 'utf8'), cipher.final(), cipher.getAuthTag()])
  const wrapped = publicEncrypt(
    { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    key,
  )

  const payload = {
    v: 1,
    alg: 'RSA-OAEP-SHA256+A256GCM',
    slug,
    iv: iv.toString('base64'),
    wrapped: wrapped.toString('base64'),
    data: sealed.toString('base64'),
    bytes: sealed.length,
  }

  await writeFile(join(OUT, `${slug}.json`), `${JSON.stringify(payload)}\n`, 'utf8')
  index.push({ slug, bytes: sealed.length })
  console.log(`protect: ${slug} — ${sealed.length} bytes sealed`)
}

await writeFile(join(OUT, 'index.json'), `${JSON.stringify({ pages: index }, null, 2)}\n`, 'utf8')
console.log(`protect: ${index.length} payloads in ${OUT}/`)
