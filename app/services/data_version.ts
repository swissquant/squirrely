/**
 * Monotonic counter bumped whenever the underlying price data changes (i.e. after
 * a successful /api/sync). Consumers that cache anything derived from the prices
 * table use it as a cheap invalidation token — no DB migration needed.
 */
let version = 0

export function currentDataVersion(): number {
  return version
}

export function bumpDataVersion(): number {
  return ++version
}
