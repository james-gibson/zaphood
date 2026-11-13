# The Office of Z.B.

The OFFICIAL homepage of the Office of Z.B. You are important. Please sign the guestbook.

A child seed of [le.gume](https://james-gibson.github.io/le.gume/): same content model, same derived
navigation, same prerender and publish gate. Different audience, different question, different
design system — this one installed a component library the way a 1998 tutorial would, then used it to
build a homepage that breaks every polite rule of the internet: a marquee, a blink, a tiled
background, a visitor counter, a webring, an under-construction banner, and an awards page the
Office gave itself.

## Run it

```bash
npm install
npm run dev
npm run build   # type-check, bundle, prerender, shells, llms.txt, guard
npm run sync    # fetch the upstream rules this seed defers to
```

## Protected pages

`/protected` lists pages whose bodies are sealed at build time with Z.B.'s RSA public key
(`keys/zb-public.pem`). The build ships only ciphertext; the page unwraps it in the browser with
WebCrypto (RSA-OAEP-256 wraps an AES-256-GCM key). No JavaScript, no plaintext.

The matching private key is published in the [release](https://github.com/james-gibson/zaphood/releases/latest).
The release is private because it is called a release.

The plaintext sources live in `private/pages/`, outside `src/`, so Vite never sees them. They are
committed because the build needs them; the guard checks that no line of any protected body reaches
`dist/`. The protection is against the reader of the site, not the reader of the repository.

## Rules

The rules are the upstream's — `https://james-gibson.github.io/le.gume/rules.md`, vendored into
`upstream/rules.md`. Local exceptions live in `upstream/overrides.md`, each with a reason. The build
publishes the effective list at `/rules.md`.

## Licence

AGPL-3.0-only.
