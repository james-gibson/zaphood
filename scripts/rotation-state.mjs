/**
 * The seed's rotational state, derived from its own ledger.
 *
 * The lab's unit of account is the *rotation*: one verified answer to one
 * isotope. A seed is a witness for that same unit — its update cycle is a loop
 * it will happily pay a rotation for, because it is local, deterministic and
 * costs no model spend. So the seed keeps the record rather than reporting to
 * one, and the record is append-only so a lost line is a finding instead of an
 * ambiguity (lezz.go#72).
 *
 * Vocabulary, borrowed rather than redefined:
 *
 *   isotope    the kind of update being verified (`rules`, `contrast`, …)
 *   rotation   one verified cycle; ids are `r000042`, contiguous, allocated only
 *              when the line lands
 *   departure  a cycle that did not verify; distance accumulates by 8, capped at 80
 *   distance   reset by a rotation, which is what makes the rungs mean "right now"
 *
 * The rungs are 42i's, unchanged: HEALTHY (<8) · MINOR (<48) · DEGRADED (<80) ·
 * COMPROMISED (=80). `scripts/rotation.mjs gate` is the policy that reads them.
 */
import { readFileSync } from 'node:fs'

export const LEDGER = 'upstream/rotations.jsonl'
/** One departure. 42i's server-manager scheme weights every kind at 8. */
export const INCREMENT = 8
export const CEILING = 80
export const RUNGS = ['HEALTHY', 'MINOR', 'DEGRADED', 'COMPROMISED']

export const id = (n) => `r${String(n).padStart(6, '0')}`
export const number = (rotationId) => {
  const match = /^r(\d+)$/.exec(String(rotationId ?? ''))
  return match ? Number(match[1]) : null
}

/** Every record, in order. A line that is not JSON is a broken ledger, not a gap. */
export function readRecords(path = LEDGER) {
  let text = ''
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return [] // No cycles recorded yet: a seed with an empty record is HEALTHY.
  }
  return text
    .split('\n')
    .map((line, index) => ({ line: line.trim(), at: index + 1 }))
    .filter(({ line }) => line)
    .map(({ line, at }) => {
      try {
        return JSON.parse(line)
      } catch {
        throw new Error(`${path}:${at} is not JSON — the ledger is append-only; a broken line is a finding`)
      }
    })
}

/**
 * The state a reader needs to decide what to do next: rung, whether a rotation
 * is open, whether the id sequence is whole, and how many rotations each
 * isotope has had. Replayed from the top every time, so there is no second
 * source of truth to disagree with.
 */
export function summarise(records) {
  let distance = 0
  let open = null
  let lastAt = null
  const rotations = []
  const isotopes = {}
  const departures = []

  for (const record of records) {
    lastAt = record.at ?? lastAt
    if (record.event === 'depart') {
      distance = Math.min(CEILING, distance + (record.weight ?? INCREMENT))
      departures.push({ kind: record.kind ?? 'unknown', isotope: record.isotope ?? null, at: record.at ?? null })
    } else if (record.event === 'open') {
      open = record
    } else if (record.event === 'rotation') {
      distance = 0
      open = null
      rotations.push(record)
      const isotope = record.isotope ?? '(unnamed)'
      isotopes[isotope] = (isotopes[isotope] ?? 0) + 1
    }
  }

  const numbers = rotations.map((record) => number(record.rotation)).filter((n) => n !== null)
  const low = numbers.length ? Math.min(...numbers) : 0
  const high = numbers.length ? Math.max(...numbers) : 0
  const present = new Set(numbers)
  const gaps = []
  if (numbers.length) for (let n = low; n <= high; n += 1) if (!present.has(n)) gaps.push(id(n))

  const rung = distance < INCREMENT ? 0 : distance < 48 ? 1 : distance < CEILING ? 2 : 3

  return {
    state: RUNGS[rung],
    rung,
    distance,
    ceiling: CEILING,
    rotations: rotations.length,
    head: numbers.length ? id(high) : null,
    open: open ? { isotope: open.isotope ?? null, at: open.at ?? null, note: open.note ?? null } : null,
    gaps,
    isotopes,
    lastAt,
    departures: departures.slice(-5),
  }
}

export const readState = (path = LEDGER) => summarise(readRecords(path))
