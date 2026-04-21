import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DataService from '#services/data_service'

export default class DataSync extends BaseCommand {
  static commandName = 'data:sync'
  static description = 'Fetch and cache Yahoo Finance daily close prices for configured markets'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const service = new DataService()
    this.logger.info('Syncing price data from Yahoo Finance...')
    const results = await service.syncAll()
    for (const r of results) {
      this.logger.success(`  ${r.ticker}: +${r.rows} rows`)
    }
    this.logger.info('Done.')
  }
}
