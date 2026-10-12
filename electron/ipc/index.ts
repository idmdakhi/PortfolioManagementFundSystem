import { registerInvestorHandlers } from './investors'
import { registerAccountHandlers } from './accounts'
import { registerTransactionHandlers } from './transactions'
import { registerSettingsHandlers } from './settings'
import { registerPeriodHandlers } from './periods'
import { registerValuationHandlers } from './valuations'
import { registerDataHandlers } from './data'

export function registerAllIpcHandlers() {
  registerInvestorHandlers()
  registerAccountHandlers()
  registerTransactionHandlers()
  registerSettingsHandlers()
  registerPeriodHandlers()
  registerValuationHandlers()
  registerDataHandlers()
  console.log('All IPC handlers registered')
}
