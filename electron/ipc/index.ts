import { registerInvestorHandlers } from './investors'
import { registerAccountHandlers } from './accounts'
import { registerTransactionHandlers } from './transactions'
import { registerSettingsHandlers } from './settings'
import { registerPeriodHandlers } from './periods'
import { registerValuationHandlers } from './valuations'

export function registerAllIpcHandlers() {
  registerInvestorHandlers()
  registerAccountHandlers()
  registerTransactionHandlers()
  registerSettingsHandlers()
  registerPeriodHandlers()
  registerValuationHandlers()
  console.log('All IPC handlers registered')
}
