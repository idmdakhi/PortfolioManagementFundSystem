export type AccountType = 'personal' | 'fund_share' | 'sub_account'
export type TransactionType = 'deposit' | 'withdraw' | 'dividend' | 'fee' | 'transfer' | 'asset_sale'
export type AssetType = 'cash' | 'stock' | 'real_estate' | 'other'

export interface Investor {
  id: number; name: string; relation: string | null; notes: string | null
  isActive: boolean; createdAt: string; updatedAt: string
}
export interface Account {
  id: number; investorId: number; name: string; type: AccountType
  parentAccountId: number | null; isActive: boolean; notes: string | null; createdAt: string
  /** derived from the ledger / valuations (not stored) */
  units?: number; costBasis?: number; marketValue?: number | null
}
export interface Transaction {
  id: number; accountId: number; type: TransactionType; amount: number
  units: number | null; date: string; description: string | null
  relatedAssetId: number | null; relatedTransactionId: number | null; createdAt: string
}
export interface FiscalPeriod {
  id: number; name: string; startDate: string; endDate: string
  months: number; isClosed: boolean; notes: string | null; createdAt: string
}
export interface SnapshotRow {
  id: number; accountId: number; accountName: string; investorName: string
  costBasis: number; averageCapital: number; marketValue: number; marketValueSource: 'valuation' | 'cost_basis'
  dividends: number; grossProfit: number; guaranteedProfit: number; managerFee: number
  returnPercent: number; units: number
}
export interface Setting {
  key: string; value: string; description: string | null; updatedAt: string
}
