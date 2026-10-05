export interface PersonRecord {
  id: number
  name: string
  groupId: number | null
  accountType: 'fund_and_personal' | 'personal_only'
  excessFeeRate: number
  feeCap: number
  isActive: boolean
  group?: { id: number; name: string } | null
}

export interface GroupRecord {
  id: number
  name: string
  isActive: boolean
}

export interface ElectronApi {
  people: {
    list: () => Promise<PersonRecord[]>
    create: (data: Partial<PersonRecord>) => Promise<PersonRecord>
    update: (id: number, data: Partial<PersonRecord>) => Promise<PersonRecord>
    remove: (id: number) => Promise<{ ok: true }>
  }
  groups: {
    list: () => Promise<GroupRecord[]>
  }
}

declare global {
  interface Window {
    api: ElectronApi
  }
}
