import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('login', [controllers.Auth, 'show'])
    router.post('login', [controllers.Auth, 'login'])
  })
  .use(middleware.guest())

router.post('logout', [controllers.Auth, 'logout']).use(middleware.auth())

router
  .group(() => {
    router.get('/', [controllers.Dashboard, 'index']).as('home')
    router.get('periods', [controllers.Periods, 'index'])
    router.get('investors', [controllers.Investors, 'index'])
    router.get('investors/:id', [controllers.Investors, 'show'])
    router.get('investors/:id/personal', [controllers.Investors, 'personalShow'])
    router.get('investors/:id/report', [controllers.Investors, 'report'])
    router.get('personal', [controllers.Personal, 'index'])
    router.get('movements', [controllers.Movements, 'index'])
    router.get('areas', [controllers.Areas, 'index'])
    router.get('transactions', [controllers.Transactions, 'index'])
    router.get('dividends', [controllers.Dividends, 'index'])
    router.get('formulas', [controllers.Formulas, 'show'])

    router
      .group(() => {
        router.post('investors', [controllers.Investors, 'store'])
        router.post('investors/:id/personal', [controllers.Investors, 'personal'])

        router.post('transactions', [controllers.Transactions, 'store'])
        router.get('transactions/:id/edit', [controllers.Transactions, 'edit'])
        router.post('transactions/:id', [controllers.Transactions, 'update'])
        router.post('transactions/:id/delete', [controllers.Transactions, 'destroy'])

        router.post('movements', [controllers.Movements, 'store'])
        router.post('movements/:batch/delete', [controllers.Movements, 'destroy'])
        router.post('areas', [controllers.Areas, 'store'])
        router.post('areas/:id/valuation', [controllers.Areas, 'valuation'])

        router.post('dividends', [controllers.Dividends, 'store'])
        router.get('dividends/:id/edit', [controllers.Dividends, 'edit'])
        router.post('dividends/:id', [controllers.Dividends, 'update'])
        router.post('dividends/:id/delete', [controllers.Dividends, 'destroy'])

        router.get('settings', [controllers.Settings, 'edit'])
        router.post('settings', [controllers.Settings, 'update'])
        router.post('settings/valuation', [controllers.Settings, 'valuation'])
        router.get('settings/backup', [controllers.Settings, 'backup'])
        router.post('settings/restore', [controllers.Settings, 'restore'])
        router.post('settings/close', [controllers.Periods, 'close'])
      })
      .use(middleware.role({ roles: ['admin'] }))
  })
  .use(middleware.auth())
