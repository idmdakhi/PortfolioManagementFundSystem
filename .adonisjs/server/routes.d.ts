import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.show': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'periods.index': { paramsTuple?: []; params?: {} }
    'investors.index': { paramsTuple?: []; params?: {} }
    'investors.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.personal_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'personal.index': { paramsTuple?: []; params?: {} }
    'movements.index': { paramsTuple?: []; params?: {} }
    'areas.index': { paramsTuple?: []; params?: {} }
    'transactions.index': { paramsTuple?: []; params?: {} }
    'dividends.index': { paramsTuple?: []; params?: {} }
    'formulas.show': { paramsTuple?: []; params?: {} }
    'fees.index': { paramsTuple?: []; params?: {} }
    'valuations.index': { paramsTuple?: []; params?: {} }
    'transactions.export': { paramsTuple?: []; params?: {} }
    'reconciliation.index': { paramsTuple?: []; params?: {} }
    'investors.store': { paramsTuple?: []; params?: {} }
    'investors.personal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'transactions.store': { paramsTuple?: []; params?: {} }
    'transactions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'transactions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'transactions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'options.index': { paramsTuple?: []; params?: {} }
    'options.store': { paramsTuple?: []; params?: {} }
    'options.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'options.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'audit.index': { paramsTuple?: []; params?: {} }
    'backup.index': { paramsTuple?: []; params?: {} }
    'backup.export': { paramsTuple?: []; params?: {} }
    'backup.import': { paramsTuple?: []; params?: {} }
    'periods.manage': { paramsTuple?: []; params?: {} }
    'periods.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'periods.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'periods.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'periods.carry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'history.store': { paramsTuple?: []; params?: {} }
    'history.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'history.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'areas.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'areas.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'areas.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'valuations.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'valuations.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.closed_edits': { paramsTuple?: []; params?: {} }
    'fees.store': { paramsTuple?: []; params?: {} }
    'fees.transfer': { paramsTuple?: []; params?: {} }
    'fees.manager': { paramsTuple?: []; params?: {} }
    'fees.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fees.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fees.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'movements.store': { paramsTuple?: []; params?: {} }
    'movements.destroy': { paramsTuple: [ParamValue]; params: {'batch': ParamValue} }
    'areas.store': { paramsTuple?: []; params?: {} }
    'areas.valuation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.store': { paramsTuple?: []; params?: {} }
    'dividends.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.edit': { paramsTuple?: []; params?: {} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'settings.bank_rate': { paramsTuple?: []; params?: {} }
    'valuations.store': { paramsTuple?: []; params?: {} }
    'valuations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'periods.close': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'auth.show': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'periods.index': { paramsTuple?: []; params?: {} }
    'investors.index': { paramsTuple?: []; params?: {} }
    'investors.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.personal_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'personal.index': { paramsTuple?: []; params?: {} }
    'movements.index': { paramsTuple?: []; params?: {} }
    'areas.index': { paramsTuple?: []; params?: {} }
    'transactions.index': { paramsTuple?: []; params?: {} }
    'dividends.index': { paramsTuple?: []; params?: {} }
    'formulas.show': { paramsTuple?: []; params?: {} }
    'fees.index': { paramsTuple?: []; params?: {} }
    'valuations.index': { paramsTuple?: []; params?: {} }
    'transactions.export': { paramsTuple?: []; params?: {} }
    'reconciliation.index': { paramsTuple?: []; params?: {} }
    'transactions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'options.index': { paramsTuple?: []; params?: {} }
    'audit.index': { paramsTuple?: []; params?: {} }
    'backup.index': { paramsTuple?: []; params?: {} }
    'backup.export': { paramsTuple?: []; params?: {} }
    'periods.manage': { paramsTuple?: []; params?: {} }
    'periods.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'areas.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'valuations.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fees.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.edit': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'auth.show': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'periods.index': { paramsTuple?: []; params?: {} }
    'investors.index': { paramsTuple?: []; params?: {} }
    'investors.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.personal_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'personal.index': { paramsTuple?: []; params?: {} }
    'movements.index': { paramsTuple?: []; params?: {} }
    'areas.index': { paramsTuple?: []; params?: {} }
    'transactions.index': { paramsTuple?: []; params?: {} }
    'dividends.index': { paramsTuple?: []; params?: {} }
    'formulas.show': { paramsTuple?: []; params?: {} }
    'fees.index': { paramsTuple?: []; params?: {} }
    'valuations.index': { paramsTuple?: []; params?: {} }
    'transactions.export': { paramsTuple?: []; params?: {} }
    'reconciliation.index': { paramsTuple?: []; params?: {} }
    'transactions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'options.index': { paramsTuple?: []; params?: {} }
    'audit.index': { paramsTuple?: []; params?: {} }
    'backup.index': { paramsTuple?: []; params?: {} }
    'backup.export': { paramsTuple?: []; params?: {} }
    'periods.manage': { paramsTuple?: []; params?: {} }
    'periods.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'areas.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'valuations.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fees.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.edit': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'investors.store': { paramsTuple?: []; params?: {} }
    'investors.personal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'transactions.store': { paramsTuple?: []; params?: {} }
    'transactions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'transactions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'options.store': { paramsTuple?: []; params?: {} }
    'options.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'options.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'backup.import': { paramsTuple?: []; params?: {} }
    'periods.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'periods.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'periods.carry': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'history.store': { paramsTuple?: []; params?: {} }
    'history.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'history.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'investors.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'areas.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'areas.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'valuations.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.closed_edits': { paramsTuple?: []; params?: {} }
    'fees.store': { paramsTuple?: []; params?: {} }
    'fees.transfer': { paramsTuple?: []; params?: {} }
    'fees.manager': { paramsTuple?: []; params?: {} }
    'fees.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'fees.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'movements.store': { paramsTuple?: []; params?: {} }
    'movements.destroy': { paramsTuple: [ParamValue]; params: {'batch': ParamValue} }
    'areas.store': { paramsTuple?: []; params?: {} }
    'areas.valuation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.store': { paramsTuple?: []; params?: {} }
    'dividends.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'settings.bank_rate': { paramsTuple?: []; params?: {} }
    'valuations.store': { paramsTuple?: []; params?: {} }
    'valuations.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'periods.close': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}