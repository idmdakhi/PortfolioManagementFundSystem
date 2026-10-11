import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../services/api'
import type { CalculationSettings } from '../services/calculations'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Record<string, string>>({})
  const calcSettings = ref<CalculationSettings | null>(null)
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const rows = await api.settings.list()
      const map: Record<string, string> = {}
      for (const row of rows) map[row.key] = row.value
      settings.value = map
      calcSettings.value = await api.settings.getCalculationSettings()
    } finally { loading.value = false }
  }
  async function set(key: string, value: string) {
    await api.settings.set(key, value)
    settings.value[key] = value
    calcSettings.value = await api.settings.getCalculationSettings()
  }
  return { settings, calcSettings, loading, fetchAll, set }
})
