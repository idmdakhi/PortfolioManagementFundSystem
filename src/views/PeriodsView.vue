<template>
  <div>
    <div class="page-header"><h2>دوره‌های مالی</h2></div>

    <div class="card" style="margin-bottom: 1.25rem">
      <h3>تعریف دوره جدید</h3>
      <form class="period-form" @submit.prevent="handleCreate">
        <div class="form-group"><label>نام *</label><input v-model="form.name" required /></div>
        <div class="form-group"><label>شروع *</label><input v-model="form.startDate" type="date" required /></div>
        <div class="form-group"><label>پایان *</label><input v-model="form.endDate" type="date" required /></div>
        <div class="form-group"><label>ماه *</label><input v-model.number="form.months" type="number" min="1" max="120" step="1" required /></div>
        <button type="submit" class="btn btn-primary">ایجاد</button>
      </form>
    </div>

    <div class="card">
      <table class="table" v-if="periods.length">
        <thead><tr><th>نام</th><th>شروع</th><th>پایان</th><th>ماه</th><th>وضعیت</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in periods" :key="p.id">
            <td>{{ p.name }}</td><td>{{ p.startDate }}</td><td>{{ p.endDate }}</td><td>{{ p.months }}</td>
            <td>{{ p.isClosed ? 'بسته' : 'باز' }}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm" @click="showSnapshots(p.id)" v-if="p.isClosed">مشاهده نتایج</button>
              <button class="btn btn-danger btn-sm" @click="handleClose(p)" v-else :disabled="busy">بستن دوره</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else style="color:#64748b">هنوز دوره‌ای تعریف نشده است.</p>
    </div>

    <div class="card" style="margin-top: 1.25rem" v-if="snapshots.length">
      <h3>نتایج دوره «{{ selectedName }}»</h3>
      <div style="overflow-x:auto">
        <table class="table">
          <thead><tr>
            <th>سرمایه‌گذار</th><th>حساب</th><th>سرمایه</th><th>میانگین وزنی</th><th>ارزش پایان</th>
            <th>سود ناخالص</th><th>سود تضمینی</th><th>کارمزد</th><th>بازده</th><th>واحد</th>
          </tr></thead>
          <tbody>
            <tr v-for="s in snapshots" :key="s.id">
              <td>{{ s.investorName }}</td><td>{{ s.accountName }}</td>
              <td class="number">{{ formatRial(s.costBasis) }}</td>
              <td class="number">{{ formatRial(s.averageCapital) }}</td>
              <td class="number">{{ formatRial(s.marketValue) }}<span v-if="s.marketValueSource === 'cost_basis'" title="ارزش‌گذاری ثبت نشده؛ برابر سرمایه فرض شد"> *</span></td>
              <td class="number">{{ formatRial(s.grossProfit) }}</td>
              <td class="number">{{ formatRial(s.guaranteedProfit) }}</td>
              <td class="number">{{ formatRial(s.managerFee) }}</td>
              <td>{{ formatPercent(s.returnPercent, 2) }}</td>
              <td>{{ formatUnits(s.units) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">* ارزش‌گذاری ثبت نشده بود؛ ارزش پایان برابر سرمایه فرض شده است.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { api, formatRial, formatPercent, formatUnits } from '../services/api'
import type { FiscalPeriod, SnapshotRow } from '../types'

const periods = ref<FiscalPeriod[]>([])
const snapshots = ref<SnapshotRow[]>([])
const selectedName = ref('')
const busy = ref(false)
const year = new Date().getFullYear()
const form = reactive({ name: '', startDate: `${year}-01-01`, endDate: `${year}-12-31`, months: 12 })

async function load() { periods.value = await api.periods.list() }
async function handleCreate() {
  try { await api.periods.create({ ...form }); form.name = ''; await load() }
  catch (e: any) { alert(e.message || 'خطا') }
}
async function showSnapshots(id: number) {
  snapshots.value = await api.periods.snapshots(id)
  selectedName.value = periods.value.find(p => p.id === id)?.name || ''
}
async function handleClose(p: FiscalPeriod) {
  busy.value = true
  try {
    const preview = await api.periods.preview(p.id)
    const msg = `بستن «${p.name}»\nتعداد حساب: ${preview.accounts.length}\nمجموع کارمزد: ${formatRial(preview.totalFee)} ریال\n\n` +
      'نتایج ثبت و کارمزدها به‌صورت تراکنش در دفتر کل می‌نشینند و بعد از بستن، هیچ تراکنشی در این بازه قابل ثبت نیست. ادامه می‌دهید؟'
    if (!confirm(msg)) return
    await api.periods.close(p.id)
    await load()
    await showSnapshots(p.id)
  } catch (e: any) { alert(e.message || 'خطا') }
  finally { busy.value = false }
}
onMounted(load)
</script>
<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.page-header h2 { margin: 0; font-size: 1.4rem; }
h3 { margin: 0 0 0.75rem; font-size: 1.05rem; }
.period-form { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
.period-form input { padding: 0.45rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; }
.form-group label { display: block; font-size: 0.85rem; margin-bottom: 0.25rem; }
.btn-sm { padding: 0.25rem 0.55rem; font-size: 0.8rem; }
.hint { color: #64748b; font-size: 0.85rem; margin-top: 0.5rem; }
</style>
