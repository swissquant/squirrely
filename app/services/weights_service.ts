export default class WeightsService {
  /**
   * Inverse-vol weights that sum to 1, with each weight capped at `cap`.
   * Excess from capped weights is redistributed proportionally to the
   * uncapped ones. Iterates until all weights respect the cap.
   */
  inverseVolWeights(vols: number[], cap = 1): number[] {
    const n = vols.length
    if (n === 0) return []
    const raw = vols.map((v) => (v > 0 ? 1 / v : 0))
    const sum = raw.reduce((s, x) => s + x, 0)
    if (sum <= 0) return new Array(n).fill(1 / n)
    let w = raw.map((x) => x / sum)

    if (cap >= 1 || cap <= 0) return w

    for (let iter = 0; iter < 50; iter++) {
      const over = w.map((x) => x > cap)
      if (!over.some(Boolean)) break
      let excess = 0
      for (let i = 0; i < n; i++) {
        if (over[i]) {
          excess += w[i] - cap
          w[i] = cap
        }
      }
      const freeSum = w.reduce((s, x, i) => (over[i] ? s : s + x), 0)
      if (freeSum <= 0) break
      for (let i = 0; i < n; i++) {
        if (!over[i]) w[i] += excess * (w[i] / freeSum)
      }
    }
    return w
  }

  /**
   * Equal Risk Contribution weights (true risk parity), long-only, fully invested.
   * Solved via Spinu's cyclical coordinate descent on x_i * (Σx)_i = b_i.
   * Cap + redistribution applied after convergence.
   */
  ercWeights(cov: number[][], cap = 1): number[] {
    const n = cov.length
    if (n === 0) return []
    if (n === 1) return [1]

    const b = new Array(n).fill(1 / n)
    let w = new Array(n).fill(1 / n)
    const maxIter = 500
    const tol = 1e-10

    for (let iter = 0; iter < maxIter; iter++) {
      let maxDelta = 0
      for (let i = 0; i < n; i++) {
        let v = 0
        for (let j = 0; j < n; j++) if (j !== i) v += cov[i][j] * w[j]
        const sii = cov[i][i]
        if (sii <= 0) continue
        const disc = v * v + 4 * sii * b[i]
        if (disc < 0) continue
        const wiNew = (-v + Math.sqrt(disc)) / (2 * sii)
        if (!Number.isFinite(wiNew) || wiNew <= 0) continue
        maxDelta = Math.max(maxDelta, Math.abs(wiNew - w[i]))
        w[i] = wiNew
      }
      const sum = w.reduce((s, x) => s + x, 0)
      if (sum <= 0) return new Array(n).fill(1 / n)
      w = w.map((x) => x / sum)
      if (maxDelta < tol) break
    }

    if (cap >= 1 || cap <= 0) return w

    for (let iter = 0; iter < 50; iter++) {
      const over = w.map((x) => x > cap)
      if (!over.some(Boolean)) break
      let excess = 0
      for (let i = 0; i < n; i++) {
        if (over[i]) {
          excess += w[i] - cap
          w[i] = cap
        }
      }
      const freeSum = w.reduce((s, x, i) => (over[i] ? s : s + x), 0)
      if (freeSum <= 0) break
      for (let i = 0; i < n; i++) {
        if (!over[i]) w[i] += excess * (w[i] / freeSum)
      }
    }
    return w
  }

  /** Leverage to hit vol target, capped at maxLev. */
  volTargetLeverage(portfolioVol: number, target: number, maxLev: number): number {
    if (portfolioVol <= 0 || !Number.isFinite(portfolioVol)) return 0
    return Math.min(target / portfolioVol, maxLev)
  }
}
