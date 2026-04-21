import vine from '@vinejs/vine'

/**
 * Shape of the /api/simulate request body. Missing basket/subBasket/market keys
 * default to `true` in the controller — we don't require the client to send
 * every flag — so those records are optional here.
 */
export const simulateParamsValidator = vine.compile(
  vine.object({
    volTarget: vine.number().min(0.01).max(1),
    volWindow: vine.number().min(20).max(252),
    cashYield: vine.number().min(0).max(1).optional(),
    rebalanceFreq: vine.enum(['daily', 'weekly', 'monthly'] as const),
    mode: vine.enum(['inverse_vol', 'erc'] as const),
    startDate: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    baskets: vine.record(vine.boolean()).optional(),
    subBaskets: vine.record(vine.boolean()).optional(),
    markets: vine.record(vine.boolean()).optional(),
  })
)
