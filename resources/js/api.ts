import type { SimParamsPayload, SimResponse, SyncResponse } from './types.ts'

let inflight: AbortController | null = null

/**
 * Supersedes any in-flight simulate request. Resolves with the latest response,
 * or rejects with AbortError if a newer call displaced this one.
 */
export async function simulate(params: SimParamsPayload): Promise<SimResponse> {
  inflight?.abort()
  const ctrl = new AbortController()
  inflight = ctrl
  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error('simulate failed: ' + res.status)
    return (await res.json()) as SimResponse
  } finally {
    if (inflight === ctrl) inflight = null
  }
}

export function simulateIsInflight(): boolean {
  return inflight !== null
}

export async function sync(): Promise<SyncResponse> {
  const res = await fetch('/api/sync', { method: 'POST' })
  if (!res.ok) throw new Error('sync failed: ' + res.status)
  return (await res.json()) as SyncResponse
}
