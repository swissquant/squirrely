import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { existsSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export default class Up extends BaseCommand {
  static commandName = 'up'
  static description =
    'Bootstrap env, run migrations, sync market data, and start the dev server'

  static options: CommandOptions = {
    startApp: false,
    staysAlive: true,
  }

  async run() {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const envPath = resolve(root, '.env')
    const envExamplePath = resolve(root, '.env.example')

    if (!existsSync(envPath)) {
      copyFileSync(envExamplePath, envPath)
      this.logger.success('Created .env from .env.example')
    }

    const env = readFileSync(envPath, 'utf8')
    if (/^APP_KEY=\s*$/m.test(env)) {
      const key = execSync('node ace generate:key --show', { cwd: root }).toString().trim()
      writeFileSync(envPath, env.replace(/^APP_KEY=.*$/m, `APP_KEY=${key}`))
      this.logger.success('Generated APP_KEY')
    }

    this.logger.info('Running migrations...')
    execSync('node ace migration:run', { cwd: root, stdio: 'inherit' })

    this.logger.info('Syncing market data...')
    execSync('node ace data:sync', { cwd: root, stdio: 'inherit' })

    this.logger.info('Starting dev server...')
    execSync('node ace serve --hmr', { cwd: root, stdio: 'inherit' })
  }
}
