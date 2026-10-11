<template>
  <div class="dashboard">
    <h2>داشبورد</h2>
    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-label">تعداد سرمایه‌گذاران فعال</div>
        <div class="stat-value">{{ activeCount }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">کل سرمایه‌گذاران</div>
        <div class="stat-value">{{ totalCount }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">دوره جاری</div>
        <div class="stat-value small">{{ currentPeriodName }}</div>
      </div>
    </div>
    <div class="card" style="margin-top: 1.5rem">
      <h3>دسترسی سریع</h3>
      <div class="quick-actions">
        <router-link to="/investors" class="btn btn-primary">مدیریت سرمایه‌گذاران</router-link>
        <router-link to="/transactions" class="btn btn-secondary">مشاهده تراکنش‌ها</router-link>
        <router-link to="/settings" class="btn btn-secondary">تنظیمات</router-link>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInvestorsStore } from '../stores/investors'
import { api } from '../services/api'
const store = useInvestorsStore()
const currentPeriodName = ref('—')
const activeCount = computed(() => store.activeInvestors.length)
const totalCount = computed(() => store.investors.length)
onMounted(async () => {
  await store.fetchAll()
  try { const p = await api.periods.current(); currentPeriodName.value = p?.name || 'تعریف نشده' } catch {}
})
</script>
<style scoped>
.dashboard h2 { margin-bottom: 1.25rem; font-size: 1.4rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.stat-card { text-align: center; }
.stat-label { font-size: 0.85rem; color: #64748b; margin-bottom: 0.4rem; }
.stat-value { font-size: 1.6rem; font-weight: 700; }
.stat-value.small { font-size: 1.1rem; }
h3 { margin: 0 0 0.75rem; font-size: 1.05rem; }
.quick-actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
</style>
