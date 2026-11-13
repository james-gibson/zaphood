import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SECTIONS } from '@/lib/content'
import { href } from '@/lib/base'

const VISITS = '000042'

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="marquee" aria-hidden="true">
        <span>
          ★ WELCOME TO THE OFFICIAL HOMEPAGE OF THE OFFICE OF Z.B. ★ YOU ARE IMPORTANT ★ PLEASE SIGN
          MY GUESTBOOK ★ THIS SITE IS UNDER CONSTRUCTION ★ BEST VIEWED IN NETSCAPE NAVIGATOR 3.0 AT
          800×600 ★ TELL A FRIEND ★ BOOKMARK THIS PAGE ★
        </span>
      </div>

      <header className="px-4 pt-8 pb-4 text-center">
        <p className="text-xs tracking-[0.3em]">AN OFFICIAL HOMEPAGE</p>
        <h1 className="rainbow tiled-title mt-2 text-4xl leading-tight font-black sm:text-6xl">
          THE OFFICE OF Z.B.
        </h1>
        <p className="mt-3 text-lg">
          <span className="blink">YOU ARE IMPORTANT!!!</span>
        </p>
        <p className="mt-1 text-sm">
          established 1998 · Y2K compliant · <Badge className="align-middle">NEW!</Badge>
        </p>
      </header>

      <nav aria-label="Sections" className="px-4 py-2 text-center text-sm">
        <a href={href('/')}>HOME</a>
        {SECTIONS.map((section) => (
          <span key={section.id}>
            {' '}
            | <a href={href(`/${section.id}`)}>{section.label.toUpperCase()}</a>
          </span>
        ))}
        {' '}| <a href={href('/protected')}>PROTECTED 🔒</a>
        {' '}| <a href={href('/guestbook/entries')}>SIGN MY GUESTBOOK</a>
      </nav>

      <Separator />

      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>

      <Separator />

      <footer className="mx-auto max-w-3xl px-4 py-6 text-center text-xs">
        <div className="construction">🚧 THIS PAGE IS UNDER CONSTRUCTION 🚧</div>
        <p className="mt-4">
          You are visitor <span className="counter">{VISITS}</span> — thank you for your importance.
        </p>
        <p className="mt-2">
          Best viewed in Netscape Navigator 3.0 at 800×600 · Made with Microsoft FrontPage 98 ·
          Hosted on a server that is definitely still on
        </p>
        <p className="mt-2">
          © 1998–2026 The Office of Z.B. · <a href="https://github.com/james-gibson/zaphood">Email me</a> ·
          No cookies, no analytics, no idea what I am doing
        </p>
        <p className="mt-2">
          <a href="https://james-gibson.github.io/le.gume/">This homepage is a child seed of le.gume</a>
        </p>
      </footer>
    </div>
  )
}
