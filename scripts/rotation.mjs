#!/usr/bin/env node
/**
 * The seed's rotation record, and the policy that reads it.
 *
 * A rotation is one verified update cycle. This seed keeps its own ledger
 * (`upstream/rotations.jsonl`, append-only, committed) instead of reporting to
 * a counter elsewhere, and decides what to do next from the state that ledger
 * derives — so "the rules moved" is not by itself a reason to publish.
 *
 *   node scripts/rotation.mjs status [--json]      # what the record says now
 *   node scripts/rotation.mjs gate                 # may this cycle publish?
 *   node scripts/rotation.mjs open   --isotope rules --note "29d863e → 41ac0f2"
 *   node scripts/rotation.mjs verify --isotope rules --subject <sha> --gates build,smoke,guard
 *   node scripts/rotation.mjs depart --kind guard --isotope rules
 *   node scripts/rotation.mjs abandon --reason "..."    # close an open cycle that will not verify
 *
 * The id is allocated only when the line lands: `verify` appends at write time
 * and refuses to allocate into a hole. A rotation recorded but not committed
 * therefore does not exist for the next cycle, which is the point — the keeper
 * is the seed, and the ledger travels with it.
 *
 * The policy (`gate`) is deliberately blunt, and every refusal names a repair:
 * a gap, an open cycle, or a rung of DEGRADED or worse stops the cycle. MINOR
 * still publishes, with its departures printed, because distance 8 is a bad day
 * and not a broken seed.
 */
import { readFile, writeFile } from 'node:fs/promises'

import { LEDGER, id, number, readState } from './rotation-state.mjs'

const args = process.argv.slice(2)
const verb = args[0] ?? 'status'
const flag = (name) => {
  const index = args.indexOf(`--${name}`)
  return index > -1 ? args[index + 1] : null
}
const now = () => new Date().toISOString()
const state = readState()

const line = (s) => {
  const isotopes = Object.entries(s.isotopes)
    .map(([isotope, count]) => `${isotope} ${count}`)
    .join(', ')
  return `rotation: ${s.state} · head ${s.head ?? '—'} · distance ${s.distance}/${s.ceiling} · ${s.rotations} rotation(s)${isotopes ? ` (${isotopes})` : ''}`
}

const append = async (record) => {
  const existing = await readFile(LEDGER, 'utf8').catch(() => '')
  const prefix = existing && !existing.endsWith('\n') ? `${existing}\n` : existing
  await writeFile(LEDGER, `${prefix}${JSON.stringify({ ...record, at: now() })}\n`, 'utf8')
}

const refuse = (message) => {
  console.error(`rotation: ${message}`)
  process.exit(1)
}

/** The policy. Read-only, so CI can run it against a read-only token. */
if (verb === 'gate') {
  const reasons = []
  if (state.gaps.length) {
    reasons.push(
      `the id sequence has a gap (${state.gaps.join(', ')}) — a rotation was lost or never recorded, ` +
        'and a gap is a finding, not an ambiguity; restore the line before publishing',
    )
  }
  if (state.open) {
    reasons.push(
      `rotation opened for ${state.open.isotope ?? '(unnamed)'} at ${state.open.at ?? 'unknown'} and never closed — ` +
        'verify it, or abandon it with a reason',
    )
  }
  if (state.rung >= 2) {
    reasons.push(
      `the seed is ${state.state} (distance ${state.distance}/${state.ceiling}) — repair before advancing; ` +
        'a cycle that publishes from here cannot claim the rotation',
    )
  }
  console.log(line(state))
  for (const departure of state.departures) {
    console.log(`rotation: departure ${departure.kind}${departure.isotope ? ` (${departure.isotope})` : ''} at ${departure.at}`)
  }
  if (reasons.length) {
    for (const reason of reasons) console.error(`rotation: ${reason}`)
    process.exit(1)
  }
  if (state.rung === 1) console.log('rotation: MINOR — publishing, with the departures above on the record')
  process.exit(0)
}

if (verb === 'status') {
  if (args.includes('--json')) {
    console.log(JSON.stringify(state, null, 2))
    process.exit(0)
  }
  console.log(line(state))
  if (state.open) console.log(`rotation: open ${state.open.isotope ?? '(unnamed)'}${state.open.note ? ` — ${state.open.note}` : ''}`)
  for (const departure of state.departures) console.log(`rotation: departure ${departure.kind} at ${departure.at}`)
  if (state.gaps.length) console.log(`rotation: gap ${state.gaps.join(', ')}`)
  process.exit(0)
}

if (verb === 'open') {
  const isotope = flag('isotope')
  if (!isotope) refuse('open needs --isotope <id> (the kind of cycle: rules, contrast, build)')
  if (state.open) refuse(`an ${state.open.isotope ?? 'unnamed'} cycle is already open — close it first`)
  if (state.gaps.length) refuse(`the id sequence has a gap (${state.gaps.join(', ')}) — restore it first`)
  await append({ event: 'open', isotope, note: flag('note') ?? undefined })
  console.log(`rotation: opened ${isotope}${flag('note') ? ` — ${flag('note')}` : ''}`)
  process.exit(0)
}

if (verb === 'verify') {
  const isotope = flag('isotope')
  if (!isotope) refuse('verify needs --isotope <id>')
  if (!state.open) refuse(`no cycle is open — \`open --isotope ${isotope}\` first, so the rotation has a subject`)
  if (state.open.isotope !== isotope) refuse(`the open cycle is ${state.open.isotope}, not ${isotope}`)
  if (state.gaps.length) refuse(`the id sequence has a gap (${state.gaps.join(', ')}) — restore it first`)
  const next = id((state.head ? (number(state.head) ?? 0) : 0) + 1)
  const gates = (flag('gates') ?? '').split(',').map((gate) => gate.trim()).filter(Boolean)
  await append({
    event: 'rotation',
    rotation: next,
    isotope,
    subject: flag('subject') ?? undefined,
    gates: gates.length ? gates : undefined,
  })
  console.log(line(readState()))
  process.exit(0)
}

if (verb === 'depart') {
  const kind = flag('kind')
  if (!kind) refuse('depart needs --kind <handshake|timeout|guard|contrast|rules|build|network|abandoned>')
  await append({ event: 'depart', kind, isotope: flag('isotope') ?? undefined })
  console.log(line(readState()))
  process.exit(0)
}

if (verb === 'abandon') {
  const reason = flag('reason')
  if (!state.open) refuse('nothing is open to abandon')
  if (!reason) refuse('abandon needs --reason "..." — an unclosed cycle is closed on the record, not deleted')
  await append({ event: 'depart', kind: 'abandoned', isotope: state.open.isotope ?? undefined, note: reason })
  console.log(line(readState()))
  process.exit(0)
}

console.error(`rotation: unknown verb "${verb}" — try status, gate, open, verify, depart, abandon`)
process.exit(2)
