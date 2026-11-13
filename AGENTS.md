# Agent hints

## This repository

`zaphood` is the OFFICIAL homepage of the Office of Z.B.: a child seed of `le.gume` with the same
content model, derived navigation, prerender and publish guard. The design is deliberately hostile
to the modern web — marquee, blink, tiled background, counter, webring — because the Office followed
a tutorial in 1998 and never stopped.

Live: https://james-gibson.github.io/zaphood/

## Rules: defer to upstream, override on the record

The rules are the upstream's — `https://james-gibson.github.io/le.gume/rules.md`, vendored by
`node scripts/sync-upstream.mjs` into `upstream/rules.md`. Do not copy them here. Exceptions go in
`upstream/overrides.md` with a rule id and a reason; the guard refuses an unknown id or an override
with no reason.

## Protected pages

- `private/pages/*.md` is the plaintext. It is outside `src/`, so the app cannot import it.
- `scripts/protected-manifest.mjs` publishes titles and descriptions to `protected/manifest.json`;
  `scripts/protect.mjs` seals the bodies into `dist/protected/<slug>.json`.
- The build encrypts with `keys/zb-public.pem`. Decryption happens only in the browser, with the
  private key from the release. There is no server-side decrypt path, by definition.
- `scripts/protect.mjs` mirrors the private key to `dist/protected/zb-private-key.pem` so a
  protected page can load it on mount: a browser cannot read a release asset (no CORS headers,
  served as an attachment). Locally it copies `.private/zb-private.pem`; in CI it fetches the
  release. Every release must carry `zb-private-key.pem` or the CI build fails the guard.
- The password is `42`. It gates the decrypt call, not the key: the key is already in memory by the
  time the form appears. The lock is decorative, and the page says so.
- `scripts/verify-publish.mjs` fails if a protected body line appears anywhere in `dist/`, or if the
  manifest and the plaintext disagree. Do not weaken that check.

## Ship improvements back

When you build something this seed does not have, consider packaging it as an isotope and proposing
it upstream rather than leaving it in the fork. A child-specific preference is not an isotope; say no
on the record instead.

## Commands

```bash
npm run dev
npm run build   # tsc --noEmit && vite build && prerender && postbuild && guard
npm run sync    # fetch upstream rules
```

`npm run build` is the gate. Do not weaken a check to get green.

## Content

- One page = one file: `src/content/<section>/<slug>.md`, frontmatter `title`, `description`,
  `order`, `updated`, `stage`.
- Sections live in `src/lib/content.ts`; the nav is derived.
- Internal links are root-absolute; the mount is applied at build time.
- Voice: ALL CAPS where the Office is excited, dry where it is not. The Office is always excited.
