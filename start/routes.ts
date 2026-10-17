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
    router.get('fees', [controllers.Fees, 'index'])
    router.get('valuations', [controllers.Valuations, 'index'])

    router
      .group(() => {
        router.post('investors', [controllers.Investors, 'store'])
        router.post('investors/:id/personal', [controllers.Investors, 'personal'])

        router.post('transactions', [controllers.Transactions, 'store'])
        router.get('transactions/:id/edit', [controllers.Transactions, 'edit'])
        router.post('transactions/:id', [controllers.Transactions, 'update'])
        router.post('transactions/:id/delete', [controllers.Transactions, 'destroy'])

        router.get('options', [controllers.Options, 'index'])
        router.post('options', [controllers.Options, 'store'])
        router.post('options/:id', [controllers.Options, 'update'])
        router.post('options/:id/delete', [controllers.Options, 'destroy'])

        router.get('backup', [controllers.Backup, 'index'])
        router.get('backup/export', [controllers.Backup, 'export'])
        router.post('backup/import', [controllers.Backup, 'import'])

        router.get('periods/manage', [controllers.Periods, 'manage'])
        router.get('periods/:id/edit', [controllers.Periods, 'edit'])
        router.post('periods/:id', [controllers.Periods, 'update'])
        router.post('periods/:id/delete', [controllers.Periods, 'destroy'])
        router.post('periods/:id/carry', [controllers.Periods, 'carry'])
        router.post('history', [controllers.History, 'store'])
        router.post('history/:id', [controllers.History, 'update'])
        router.post('history/:id/delete', [controllers.History, 'destroy'])
        router.get('investors/:id/edit', [controllers.Investors, 'edit'])
        router.post('investors/:id', [controllers.Investors, 'update'])
        router.post('investors/:id/delete', [controllers.Investors, 'destroy'])
        router.get('areas/:id/edit', [controllers.Areas, 'edit'])
        router.post('areas/:id', [controllers.Areas, 'update'])
        router.post('areas/:id/delete', [controllers.Areas, 'destroy'])
        router.get('valuations/:id/edit', [controllers.Valuations, 'edit'])
        router.post('valuations/:id', [controllers.Valuations, 'update'])
        router.post('settings/closed-edits', [controllers.Settings, 'closedEdits'])

        router.post('fees', [controllers.Fees, 'store'])
        router.post('fees/transfer', [controllers.Fees, 'transfer'])
        router.post('fees/manager', [controllers.Fees, 'manager'])
        router.get('fees/:id/edit', [controllers.Fees, 'edit'])
        router.post('fees/:id', [controllers.Fees, 'update'])
        router.post('fees/:id/delete', [controllers.Fees, 'destroy'])

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
        router.post('settings/bank-rate', [controllers.Settings, 'bankRate'])
        router.post('valuations', [controllers.Valuations, 'store'])
        router.post('valuations/:id/delete', [controllers.Valuations, 'destroy'])
        router.post('settings/close', [controllers.Periods, 'close'])
      })
      .use(middleware.role({ roles: ['admin'] }))
  })
  .use(middleware.auth())
