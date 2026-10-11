<template>
  <div>
    <div class="page-header"><h2>تنظیمات</h2></div>
    <div v-if="store.loading" class="card">در حال بارگذاری...</div>
    <div v-else class="card">
      <h3>نرخ‌های کارمزد و سود</h3>
      <p class="hint">تمام این مقادیر در محاسبات استفاده می‌شوند و قابل تغییر هستند.</p>
      <div class="settings-grid">
        <div class="setting-item" v-for="item in settingItems" :key="item.key">
          <label>{{ item.label }}</label>
          <div class="input-row">
            <input type="number" v-model.number="localValues[item.key]" :step="item.step" :min="0" />
            <span class="unit">{{ item.unit }}</span>
            <button class="btn btn-primary btn-sm" :disabled="savingKey === item.key" @click="save(item.key)">
              {{ savingKey === item.key ? '...' : 'ذخیره' }}
            </button>
          </div>
          <p class="desc">{{ item.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useSettingsStore } from '../stores/settings'
const store = useSettingsStore()
const savingKey = ref<string | null>(null)
const localValues = reactive<Record<string, number>>({})
const settingItems = [
  { key: 'guaranteed_return_rate', label: 'نرخ سود تضمینی', unit: '٪ سالانه', step: 0.1, description: 'سود تضمینی متعلق به مشتری' },
  { key: 'fixed_fee_rate', label: 'کارمزد ثابت سبدگردان', unit: '٪ سالانه', step: 0.1, description: 'کارمزد ثابت از ارزش خرید' },
  { key: 'performance_fee_rate', label: 'کارمزد عملکرد (مازاد)', unit: '٪', step: 1, description: 'سهم سبدگردان از سود مازاد' },
  { key: 'max_fee_cap', label: 'سقف کارمزد', unit: 'ریال', step: 1000000, description: 'حداکثر کارمزد سالانه (برای دوره‌های کوتاه‌تر متناسب می‌شود)' },
  { key: 'fee_rounding', label: 'مضرب رند کردن', unit: 'ریال', step: 10000, description: 'رند به مضرب این عدد' },
  { key: 'default_period_months', label: 'طول دوره مالی', unit: 'ماه', step: 1, description: 'تعداد ماه دوره پیش‌فرض' }
]
onMounted(async () => { await store.fetchAll(); syncLocal() })
watch(() => store.settings, syncLocal, { deep: true })
function syncLocal() {
  for (const item of settingItems) localValues[item.key] = parseFloat(store.settings[item.key] || '0')
}
async function save(key: string) {
  savingKey.value = key
  try { await store.set(key, String(localValues[key])) }
  catch (e: any) { alert(e.message || 'خطا') }
  finally { savingKey.value = null }
}
</script>
<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.page-header h2 { margin: 0; font-size: 1.4rem; }
h3 { margin: 0 0 0.35rem; font-size: 1.1rem; }
.hint { color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem; }
.settings-grid { display: flex; flex-direction: column; gap: 1.25rem; }
.setting-item label { display: block; font-weight: 600; margin-bottom: 0.4rem; font-size: 0.95rem; }
.input-row { display: flex; align-items: center; gap: 0.5rem; }
.input-row input { width: 160px; padding: 0.45rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 0.95rem; }
.input-row input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
.unit { color: #64748b; font-size: 0.85rem; min-width: 70px; }
.desc { margin-top: 0.3rem; font-size: 0.8rem; color: #94a3b8; }
.btn-sm { padding: 0.35rem 0.75rem; font-size: 0.85rem; }
</style>
