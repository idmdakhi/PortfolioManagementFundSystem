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
    router.get('investors', [controllers.Investors, 'index'])
    router.get('investors/:id', [controllers.Investors, 'show'])
    router.get('transactions', [controllers.Transactions, 'index'])

    router
      .group(() => {
        router.post('investors', [controllers.Investors, 'store'])
        router.post('investors/:id/personal', [controllers.Investors, 'personal'])
        router.post('transactions', [controllers.Transactions, 'store'])
        router.get('settings', [controllers.Settings, 'edit'])
        router.post('settings', [controllers.Settings, 'update'])
        router.post('settings/valuation', [controllers.Settings, 'valuation'])
      })
      .use(middleware.role({ roles: ['admin'] }))
  })
  .use(middleware.auth())
