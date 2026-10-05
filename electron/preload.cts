import { contextBridge, ipcRenderer } from 'electron'

/**
 * سطح تماس امن renderer → main. renderer هرگز مستقیم به Node/Electron
 * دسترسی ندارد؛ فقط از همین متدهای مشخص عبور می‌کند (نه IPC آزاد دلخواه).
 */
contextBridge.exposeInMainWorld('api', {
  people: {
    list: () => ipcRenderer.invoke('people:list'),
    create: (data: unknown) => ipcRenderer.invoke('people:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('people:update', id, data),
    remove: (id: number) => ipcRenderer.invoke('people:remove', id),
  },
  groups: {
    list: () => ipcRenderer.invoke('groups:list'),
  },
})
