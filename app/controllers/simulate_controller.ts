import type { HttpContext } from '@adonisjs/core/http'
import SimulationService, { SimParams } from '#services/simulation_service'
import { BASKETS, BasketId, MARKETS, SUB_BASKETS } from '#config/markets'
import { simulateParamsValidator } from '#validators/simulate_params'
import { downsampleIndices } from '#services/metrics_service'

const MAX_EQUITY_POINTS = 2500

export default class SimulateController {
  async run({ request, response }: HttpContext) {
    const input = await request.validateUsing(simulateParamsValidator)

    const params: SimParams = {
      volTarget: input.volTarget,
      volWindow: Math.round(input.volWindow),
      cashYield: input.cashYield ?? 0,
      rebalanceFreq: input.rebalanceFreq,
      mode: input.mode,
      startDate: input.startDate,
      baskets: fillDefaults(BASKETS, input.baskets) as Record<BasketId, boolean>,
      subBaskets: fillDefaults(
        SUB_BASKETS.map((s) => s.id),
        input.subBaskets
      ),
      markets: fillDefaults(
        MARKETS.map((m) => m.id),
        input.markets
      ),
    }

    const svc = new SimulationService()
    const result = await svc.run(params)
    await svc.attachLatestCloses(result.latestAllocation)

    const idxs = downsampleIndices(result.dates.length, MAX_EQUITY_POINTS)
    const dates = idxs.map((i) => result.dates[i])
    const equity = idxs.map((i) => result.equity[i])

    return response.json({
      dates,
      equity,
      metrics: result.metrics,
      latestAllocation: result.latestAllocation,
      cashWeight: result.cashWeight,
      grossExposure: result.grossExposure,
      lastRebalanceDate: result.lastRebalanceDate,
      dataAsOfDate: result.dataAsOfDate,
      perAsset: result.perAsset,
    })
  }
}

function fillDefaults(keys: readonly string[], input: Record<string, boolean> | undefined) {
  const out: Record<string, boolean> = {}
  for (const k of keys) out[k] = input ? input[k] !== false : true
  return out
}
