import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  investors: {
    list: () => ipcRenderer.invoke('investors:list'),
    get: (id: number) => ipcRenderer.invoke('investors:get', id),
    create: (data: { name: string; relation?: string; notes?: string }) => ipcRenderer.invoke('investors:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('investors:update', id, data),
    deactivate: (id: number) => ipcRenderer.invoke('investors:deactivate', id),
    accounts: (investorId: number) => ipcRenderer.invoke('investors:accounts', investorId)
  },
  accounts: {
    create: (data: any) => ipcRenderer.invoke('accounts:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('accounts:update', id, data),
    get: (id: number) => ipcRenderer.invoke('accounts:get', id),
    getUnits: (accountId: number) => ipcRenderer.invoke('accounts:getUnits', accountId),
    setUnits: (accountId: number, units: number) => ipcRenderer.invoke('accounts:setUnits', accountId, units)
  },
  transactions: {
    list: (filters?: any) => ipcRenderer.invoke('transactions:list', filters),
    create: (data: any) => ipcRenderer.invoke('transactions:create', data),
    reverse: (id: number) => ipcRenderer.invoke('transactions:reverse', id),
    summary: (accountId: number, fromDate: string, toDate: string) => ipcRenderer.invoke('transactions:summary', accountId, fromDate, toDate)
  },
  settings: {
    list: () => ipcRenderer.invoke('settings:list'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getCalculationSettings: () => ipcRenderer.invoke('settings:getCalculationSettings')
  },
  periods: {
    list: () => ipcRenderer.invoke('periods:list'),
    create: (data: any) => ipcRenderer.invoke('periods:create', data),
    close: (id: number) => ipcRenderer.invoke('periods:close', id),
    current: () => ipcRenderer.invoke('periods:current')
  },
  valuations: {
    create: (data: any) => ipcRenderer.invoke('valuations:create', data),
    latest: (accountId?: number | null) => ipcRenderer.invoke('valuations:latest', accountId),
    list: (accountId?: number | null) => ipcRenderer.invoke('valuations:list', accountId)
  }
}

contextBridge.exposeInMainWorld('api', api)
export type ElectronAPI = typeof api
