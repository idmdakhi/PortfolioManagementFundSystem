import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../services/api'
import type { Transaction } from '../types'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchList(filters?: any) {
    loading.value = true; error.value = null
    try { transactions.value = await api.transactions.list(filters) }
    catch (e: any) { error.value = e.message || 'خطا' }
    finally { loading.value = false }
  }
  async function create(data: any) {
    const created = await api.transactions.create(data)
    transactions.value.unshift(created)
    return created
  }
  // Ledger entries are never deleted: a reversal is a new, negating entry.
  async function reverse(id: number) {
    const reversal = await api.transactions.reverse(id)
    transactions.value.unshift(reversal)
    return reversal
  }
  return { transactions, loading, error, fetchList, create, reverse }
})
