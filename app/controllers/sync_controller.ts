import type { HttpContext } from '@adonisjs/core/http'
import DataService from '#services/data_service'

export default class SyncController {
  async run({ response }: HttpContext) {
    const svc = new DataService()
    const results = await svc.syncAll()
    const total = results.reduce((s, r) => s + r.rows, 0)

    return response.json({
      results,
      total,
    })
  }
}
