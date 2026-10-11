import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'
import type { Investor, Account } from '../types'

export const useInvestorsStore = defineStore('investors', () => {
  const investors = ref<Investor[]>([])
  const currentInvestor = ref<Investor | null>(null)
  const currentAccounts = ref<Account[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activeInvestors = computed(() => investors.value.filter(i => i.isActive))

  async function fetchAll() {
    loading.value = true; error.value = null
    try { investors.value = await api.investors.list() }
    catch (e: any) { error.value = e.message || 'خطا' }
    finally { loading.value = false }
  }
  async function fetchOne(id: number) {
    loading.value = true; error.value = null
    try {
      currentInvestor.value = await api.investors.get(id)
      currentAccounts.value = await api.investors.accounts(id)
    } catch (e: any) { error.value = e.message || 'خطا' }
    finally { loading.value = false }
  }
  async function create(data: { name: string; relation?: string; notes?: string }) {
    const created = await api.investors.create(data)
    investors.value.push(created)
    return created
  }
  async function update(id: number, data: any) {
    const updated = await api.investors.update(id, data)
    const idx = investors.value.findIndex(i => i.id === id)
    if (idx >= 0) investors.value[idx] = updated
    if (currentInvestor.value?.id === id) currentInvestor.value = updated
    return updated
  }
  async function deactivate(id: number) {
    await api.investors.deactivate(id)
    const idx = investors.value.findIndex(i => i.id === id)
    if (idx >= 0) investors.value[idx].isActive = false
  }
  async function createAccount(data: any) {
    const account = await api.accounts.create(data)
    if (currentInvestor.value?.id === data.investorId) currentAccounts.value.push(account)
    return account
  }
  return { investors, currentInvestor, currentAccounts, loading, error, activeInvestors, fetchAll, fetchOne, create, update, deactivate, createAccount }
})
