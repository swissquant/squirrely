import { test } from '@japa/runner'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import SimulationService from '#services/simulation_service'
import type { SimParams } from '#services/simulation_service'
import { buildFixture, defaultParams } from './sim_fixture.js'

const here = dirname(fileURLToPath(import.meta.url))
const FIXTURES = resolve(here, 'fixtures')

function snapshotPath(name: string) {
  return resolve(FIXTURES, `${name}.json`)
}

function runSim(paramOverrides: Partial<SimParams> = {}) {
  const aligned = buildFixture()
  const params: SimParams = { ...defaultParams(), ...paramOverrides }
  const svc = new SimulationService()
  return svc.simulate(aligned, params)
}

function assertMatches(name: string, actual: unknown, assert: any) {
  const path = snapshotPath(name)
  const serialized = JSON.stringify(actual, null, 2)
  if (process.env.UPDATE_SNAPSHOTS === '1' || !existsSync(path)) {
    writeFileSync(path, serialized + '\n')
    return
  }
  const expected = readFileSync(path, 'utf8').trimEnd()
  assert.equal(serialized, expected)
}

test.group('simulation snapshot', () => {
  test('inverse_vol monthly default', ({ assert }) => {
    assertMatches('sim_inverse_vol_monthly', runSim(), assert)
  })

  test('erc monthly', ({ assert }) => {
    assertMatches('sim_erc_monthly', runSim({ mode: 'erc' }), assert)
  })

  test('inverse_vol weekly', ({ assert }) => {
    assertMatches('sim_inverse_vol_weekly', runSim({ rebalanceFreq: 'weekly' }), assert)
  })

  test('inverse_vol daily short window', ({ assert }) => {
    assertMatches(
      'sim_inverse_vol_daily',
      runSim({ rebalanceFreq: 'daily', volWindow: 60 }),
      assert
    )
  })
})
