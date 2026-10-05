import type { IpcMain } from 'electron'

export function registerGroupsIpc(ipcMain: IpcMain) {
  ipcMain.handle('groups:list', async () => {
    const { default: Group } = await import('#models/group')
    const groups = await Group.query().orderBy('id')
    return groups.map((g) => g.serialize())
  })
}
