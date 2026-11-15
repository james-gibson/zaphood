#!/usr/bin/env node
/**
 * The overflow gate: no seed may publish a page that scrolls sideways at 320px.
 *
 * This is the half of 320px overflow that *is* statically decidable. A browser
 * can measure the other half (`doomlint` says so at the end of every run), so
 * this script refuses the causes it can be certain of instead of guessing at a
 * rendered width:
 *
 *   OVF-01  a shell has no `viewport` meta, so a phone lays the page out at its
 *           default 980px width and *everything* overflows
 *   OVF-02  a declaration in use sets `width` / `min-width` / `flex-basis` to a
 *           literal >= 321px outside a media query; "in use" means its selector
 *           names a class or element that appears in a shell, so an unused
 *           library rule is not a finding
 *   OVF-03  a `<table>` or `<pre>` in a styled shell has no ancestor whose class
 *           declares an unconditional `overflow-x: auto | scroll`; the box has
 *           nothing to scroll in and takes the page with it. A shell with no
 *           stylesheet link is exempt from the broad rule — an unstyled table
 *           wraps at its spaces, and one of them (the bare page) is *checked* by its
 *           own guard for carrying no style at all. There, only a certain
 *           overflow is a finding: a cell with an unbreakable run of 40+ chars,
 *           or a `<pre>` line that long, which cannot wrap without CSS.
 *   OVF-04  an inline `style` on a rendered element carries a literal width
 *           > 320px
 *
 * There is no waiver list, and that is deliberate: an override is a decision
 * about a *design* (zaphood is allowed to be a marquee), but a horizontal
 * scrollbar is never the design — it is content the reader cannot reach. A
 * finding here is fixed, not waived.
 *
 *   node scripts/overflow.mjs [dist]
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = process.argv[2] ?? 'dist'
const WIDTH = 320
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
])
const failures = []
const fail = (check, detail) => failures.push({ check, detail })

const walk = async (dir) => {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

const files = await walk(ROOT).catch(() => {
  console.error(`overflow: ${ROOT} does not exist — build first`)
  process.exit(2)
})
const html = files.filter((file) => file.endsWith('.html'))
const css = files.filter((file) => file.endsWith('.css'))
if (!html.length || !css.length) {
  console.error(`overflow: ${ROOT} has no HTML or no CSS — build first`)
  process.exit(2)
}

/** Every CSS rule, with whether an at-rule (media/supports) encloses it. */
function* cssRules(text) {
  let index = 0
  let head = ''
  const atRules = []
  while (index < text.length) {
    const ch = text[index]
    if (ch === '{') {
      const selector = head.trim()
      head = ''
      if (selector.startsWith('@')) {
        atRules.push(selector)
        index += 1
        continue
      }
      const start = index + 1
      let depth = 1
      let end = start
      while (end < text.length && depth > 0) {
        if (text[end] === '{') depth += 1
        else if (text[end] === '}') depth -= 1
        end += 1
      }
      yield {
        selector,
        body: text.slice(start, end - 1),
        conditional: atRules.some((rule) => rule.startsWith('@media') || rule.startsWith('@supports')),
      }
      index = end
      continue
    }
    if (ch === '}') {
      atRules.pop()
      head = ''
      index += 1
      continue
    }
    if (ch === ';' && !atRules.length) {
      head = ''
      index += 1
      continue
    }
    head += ch
    index += 1
  }
}

const shells = new Map()
for (const file of html) shells.set(file, await readFile(file, 'utf8'))

/** Class tokens and element names the published pages actually use. */
const classesInUse = new Set()
const tagsInUse = new Set()
for (const text of shells.values()) {
  for (const [, list] of text.matchAll(/class="([^"]*)"/g)) {
    for (const name of list.split(/\s+/)) if (name) classesInUse.add(name)
  }
  for (const [, tag] of text.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)[\s>]/g)) tagsInUse.add(tag.toLowerCase())
}

const WIDE = /(?:^|;)\s*(?:width|min-width|flex-basis)\s*:\s*(\d+(?:\.\d+)?)px/g
const SCROLL = /(?:^|;)\s*overflow(?:-x)?\s*:\s*(auto|scroll)\b/

/**
 * The element a selector styles: the last compound of each comma-separated
 * selector. `.prose pre` styles the `pre`, not `.prose` — getting this wrong is
 * how a table's ancestor looks like a scroller it is not.
 */
const subjectOf = (selector) => {
  const parts = selector.split(',').map((part) => part.trim().split(/[\s>+~]+/).filter(Boolean).pop() ?? '')
  const out = { classes: new Set(), tags: new Set() }
  for (const part of parts) {
    for (const [, name] of part.matchAll(/\.([a-zA-Z0-9_-]+)/g)) out.classes.add(name)
    if (/^[a-z][a-zA-Z0-9-]*$/.test(part.replace(/[:[].*$/, ''))) out.tags.add(part.replace(/[:\[].*$/, ''))
  }
  return out
}

/** Classes and tags on an element that give it, or its content, a scroller. */
const scrollClasses = new Set()
const scrollTags = new Set()

for (const file of css) {
  for (const rule of cssRules(await readFile(file, 'utf8'))) {
    if (rule.conditional) continue
    if (SCROLL.test(rule.body)) {
      const subject = subjectOf(rule.selector)
      for (const name of subject.classes) scrollClasses.add(name)
      for (const tag of subject.tags) scrollTags.add(tag)
    }
    if (!rule.selector) continue
    // --- OVF-02 ----------------------------------------------------------
    const wide = [...rule.body.matchAll(WIDE)].map((match) => Number(match[1])).find((n) => n > WIDTH)
    if (wide === undefined) continue
    const subject = subjectOf(rule.selector)
    const used = subject.classes.size
      ? [...subject.classes].some((name) => classesInUse.has(name))
      : [...subject.tags].some((name) => tagsInUse.has(name))
    if (used) {
      fail(
        'OVF-02',
        `${file.replace(`${ROOT}/`, '')}: "${rule.selector}" is ${wide}px wide outside a media query, and the page uses it`,
      )
    }
  }
}

/** The tag stream of a shell, without the contents of script/style. */
const tagStream = (text) =>
  text
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .matchAll(/<(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)

/** Certain overflow without a scroller: a run of text that cannot wrap. */
const UNBREAKABLE = 40
const certainOverflow = (element, body) =>
  element === 'pre'
    ? body.split('\n').some((line) => line.trim().length >= UNBREAKABLE)
    : /[^\s<>]{40,}/.test(body)

const hasScroller = (element) => {
  const list = (/class="([^"]*)"/.exec(element.attributes) ?? [])[1] ?? ''
  if ([...list.split(/\s+/).filter(Boolean)].some((name) => scrollClasses.has(name))) return true
  // An inline scroll container is how a deliberately stylesheet-free page can
  // stay reachable: the wrapper adds no look, it only lets the table move.
  const style = (/style="([^"]*)"/.exec(element.attributes) ?? [])[1] ?? ''
  if (SCROLL.test(style)) return true
  return scrollTags.has(element.tag)
}

for (const [file, text] of shells) {
  const short = file.replace(`${ROOT}/`, '')

  // --- OVF-01 --------------------------------------------------------------
  const viewport = text.match(/<meta[^>]+name="viewport"[^>]*>/i)
  if (!viewport) fail('OVF-01', `${short} has no viewport meta — a phone lays it out at 980px`)
  else if (!/width=device-width/i.test(viewport[0])) {
    fail('OVF-01', `${short} names a viewport but not width=device-width`)
  }

  // --- OVF-04 --------------------------------------------------------------
  for (const [, style] of text.matchAll(/style="([^"]*)"/g)) {
    for (const match of style.matchAll(/(?:^|;)\s*(?:width|min-width)\s*:\s*(\d+(?:\.\d+)?)px/g)) {
      if (Number(match[1]) > WIDTH) fail('OVF-04', `${short} has an inline style ${match[1]}px wide`)
    }
  }

  // --- OVF-03 --------------------------------------------------------------
  const styled = /<link[^>]+rel=["']?stylesheet/i.test(text)
  const stack = []
  for (const match of tagStream(text)) {
    const [, closing, tag, attributes] = match
    const name = tag.toLowerCase()
    if (closing) {
      const at = stack.map((element) => element.tag).lastIndexOf(name)
      if (at !== -1) stack.length = at
      continue
    }
    if (name === 'table' || name === 'pre') {
      const enclosed = hasScroller({ tag: name, attributes }) || stack.some(hasScroller)
      if (!enclosed) {
        const close = text.indexOf(`</${name}>`, match.index ?? 0)
        const body = text.slice(match.index ?? 0, close === -1 ? (match.index ?? 0) + 4000 : close)
        if (styled || certainOverflow(name, body)) {
          fail(
            'OVF-03',
            `${short} has a <${name}> with no ancestor that scrolls (overflow-x: auto)` +
              (styled ? '' : ' and content that cannot wrap'),
          )
        }
      }
    }
    if (!VOID.has(name) && !/\/\s*$/.test(attributes)) stack.push({ tag: name, attributes })
  }
}

if (failures.length) {
  console.error(`overflow: ${failures.length} finding(s) at 320px\n`)
  for (const { check, detail } of failures) console.error(`  ${check}  ${detail}`)
  console.error('\nA page that scrolls sideways hides content from the reader. Fix the box.')
  process.exit(1)
}

console.log(
  `overflow: ${shells.size} shell(s), ${css.length} stylesheet(s) — no certain overflow at ${WIDTH}px ` +
    '(a browser still has to confirm wrapping and text metrics)',
)
