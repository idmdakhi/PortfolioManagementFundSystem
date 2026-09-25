/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
/**
 * اسکلت مسیرها — بعد از نصب Adonis فعال می‌شود
 *
 * import router from '@adonisjs/core/services/router'
 *
 * router.get('/health', async () => ({ ok: true }))
 *
 * router.group(() => {
 *   router.resource('people', '#controllers/people_controller')
 *   router.resource('groups', '#controllers/groups_controller')
 *   router.get('settings', '#controllers/settings_controller.show')
 *   router.put('settings', '#controllers/settings_controller.update')
 *
 *   router.resource('fund-transactions', '#controllers/fund_transactions_controller')
 *   router.resource('personal-transactions', '#controllers/personal_transactions_controller')
 *   router.resource('group-transactions', '#controllers/group_transactions_controller')
 *
 *   router.get('dashboard/overview', '#controllers/dashboard_controller.overview')
 *   router.get('dashboard/person/:id', '#controllers/dashboard_controller.person')
 *   router.post('year-end/close', '#controllers/year_end_controller.close')
 * }).prefix('/api')
 */

export const routeMap = {
  health: 'GET /health',
  people: 'CRUD /api/people',
  groups: 'CRUD /api/groups',
  settings: 'GET|PUT /api/settings',
  fundTx: 'CRUD /api/fund-transactions',
  personalTx: 'CRUD /api/personal-transactions',
  groupTx: 'CRUD /api/group-transactions',
  dashboardOverview: 'GET /api/dashboard/overview',
  dashboardPerson: 'GET /api/dashboard/person/:id',
  yearEndClose: 'POST /api/year-end/close',
}
