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
    'investors.store': { paramsTuple?: []; params?: {} }
    'investors.personal': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'transactions.store': { paramsTuple?: []; params?: {} }
    'transactions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'transactions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'transactions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'settings.valuation': { paramsTuple?: []; params?: {} }
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
    'transactions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'transactions.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'movements.store': { paramsTuple?: []; params?: {} }
    'movements.destroy': { paramsTuple: [ParamValue]; params: {'batch': ParamValue} }
    'areas.store': { paramsTuple?: []; params?: {} }
    'areas.valuation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.store': { paramsTuple?: []; params?: {} }
    'dividends.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dividends.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'settings.valuation': { paramsTuple?: []; params?: {} }
    'periods.close': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}