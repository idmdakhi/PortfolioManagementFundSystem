import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import { browserClient } from '@japa/browser-client'
import { rmSync } from 'node:fs'
import { authBrowserClient } from '@adonisjs/auth/plugins/browser_client'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  browserClient({ runInSuites: ['browser'] }),
  sessionBrowserClient(app),
  authBrowserClient(app),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (suite.name === 'integration') {
    // Fresh private database for every run (DB_PATH comes from .env.test); never the real one.
    suite.setup(async () => {
      if (!String(process.env.DB_PATH ?? '').includes('test')) throw new Error('Refusing to run integration tests: DB_PATH is not a test database')
      rmSync(app.makePath(String(process.env.DB_PATH)), { force: true })
      await testUtils.db().migrate()
    })
  }
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
