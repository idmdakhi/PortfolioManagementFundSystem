<template>
  <div>
    <div class="page-header">
      <div>
        <router-link to="/investors" class="back-link">← بازگشت به لیست</router-link>
        <h2 v-if="store.currentInvestor">{{ store.currentInvestor.name }}</h2>
        <p v-if="store.currentInvestor?.relation" class="relation">{{ store.currentInvestor.relation }}</p>
      </div>
      <button class="btn btn-primary" @click="showAccountModal = true">+ افزودن حساب</button>
    </div>
    <div v-if="store.loading" class="card">در حال بارگذاری...</div>
    <div v-else-if="!store.currentInvestor" class="card">سرمایه‌گذار یافت نشد.</div>
    <template v-else>
      <div class="card" style="margin-bottom: 1.25rem">
        <h3>حساب‌ها</h3>
        <table class="table" v-if="store.currentAccounts.length" style="margin-top: 0.75rem">
          <thead><tr><th>نام حساب</th><th>نوع</th><th>وضعیت</th><th>واحد</th><th>سرمایه (ریال)</th><th>آخرین ارزش (ریال)</th></tr></thead>
          <tbody>
            <tr v-for="acc in store.currentAccounts" :key="acc.id">
              <td>{{ acc.name }}</td>
              <td><span class="type-badge">{{ accountTypeLabel(acc.type) }}</span></td>
              <td>{{ acc.isActive ? 'فعال' : 'غیرفعال' }}</td>
              <td>{{ acc.type === 'fund_share' ? formatUnits(acc.units) : '—' }}</td>
              <td class="number">{{ formatRial(acc.costBasis) }}</td>
              <td class="number">{{ acc.marketValue != null ? formatRial(acc.marketValue) : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else style="color:#64748b; margin-top:0.75rem">هنوز حسابی تعریف نشده است.</p>
      </div>
      <div class="card">
        <h3>ثبت تراکنش جدید</h3>
        <form class="tx-form" @submit.prevent="handleCreateTx">
          <div class="form-row">
            <div class="form-group">
              <label>حساب *</label>
              <select v-model="txForm.accountId" required>
                <option value="" disabled>انتخاب حساب</option>
                <option v-for="acc in store.currentAccounts" :key="acc.id" :value="acc.id">{{ acc.name }} ({{ accountTypeLabel(acc.type) }})</option>
              </select>
            </div>
            <div class="form-group">
              <label>نوع *</label>
              <select v-model="txForm.type" required>
                <option value="deposit">واریز</option>
                <option value="withdraw">برداشت</option>
                <option value="dividend">سود نقدی</option>
              </select>
            </div>
            <div class="form-group">
              <label>مبلغ (ریال) *</label>
              <input v-model.number="txForm.amount" type="number" min="0" step="1" required />
            </div>
            <div class="form-group" v-if="needsUnits">
              <label>تعداد واحد *</label>
              <input v-model.number="txForm.units" type="number" min="0" step="any" required />
            </div>
            <div class="form-group">
              <label>تاریخ *</label>
              <input v-model="txForm.date" type="date" required />
            </div>
          </div>
          <div class="form-group"><label>توضیحات</label><input v-model="txForm.description" /></div>
          <button type="submit" class="btn btn-primary" :disabled="txSaving">{{ txSaving ? '...' : 'ثبت تراکنش' }}</button>
        </form>
      </div>
      <div class="card" style="margin-top: 1.25rem">
        <h3>ثبت ارزش‌گذاری حساب</h3>
        <p class="hint">ارزش بازار روز حساب را ثبت کنید؛ هنگام بستن دوره برای محاسبه سود و کارمزد استفاده می‌شود.</p>
        <form class="tx-form" @submit.prevent="handleCreateVal">
          <div class="form-row">
            <div class="form-group">
              <label>حساب *</label>
              <select v-model="valForm.accountId" required>
                <option value="" disabled>انتخاب حساب</option>
                <option v-for="acc in store.currentAccounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>ارزش بازار (ریال) *</label>
              <input v-model.number="valForm.marketValue" type="number" min="0" step="1" required />
            </div>
            <div class="form-group">
              <label>تاریخ *</label>
              <input v-model="valForm.date" type="date" required />
            </div>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="valSaving">{{ valSaving ? '...' : 'ثبت ارزش‌گذاری' }}</button>
        </form>
      </div>
    </template>
    <div v-if="showAccountModal" class="modal-overlay" @click.self="showAccountModal = false">
      <div class="modal">
        <h3>افزودن حساب جدید</h3>
        <form @submit.prevent="handleCreateAccount">
          <div class="form-group"><label>نام حساب *</label><input v-model="accForm.name" required /></div>
          <div class="form-group">
            <label>نوع حساب *</label>
            <select v-model="accForm.type" required>
              <option value="personal">حساب شخصی</option>
              <option value="fund_share">سهم از صندوق</option>
              <option value="sub_account">حساب فرعی</option>
            </select>
          </div>
          <div class="form-group"><label>توضیحات</label><textarea v-model="accForm.notes" rows="2"></textarea></div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="showAccountModal = false">انصراف</button>
            <button type="submit" class="btn btn-primary" :disabled="accSaving">ذخیره</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInvestorsStore } from '../stores/investors'
import { useTransactionsStore } from '../stores/transactions'
import { api, formatRial, formatUnits } from '../services/api'
import type { AccountType } from '../types'
const route = useRoute()
const store = useInvestorsStore()
const txStore = useTransactionsStore()
const showAccountModal = ref(false)
const accSaving = ref(false)
const txSaving = ref(false)
const valSaving = ref(false)
const valForm = reactive({ accountId: '' as number | '', marketValue: 0, date: new Date().toISOString().slice(0,10) })
const accForm = reactive({ name: '', type: 'personal' as AccountType, notes: '' })
const txForm = reactive({ accountId: '' as number | '', type: 'deposit' as 'deposit'|'withdraw'|'dividend', amount: 0, units: 0, date: new Date().toISOString().slice(0,10), description: '' })
// Fund-share accounts must record units on deposit/withdraw (the ledger enforces this too).
const needsUnits = computed(() => {
  const acc = store.currentAccounts.find(a => a.id === Number(txForm.accountId))
  return acc?.type === 'fund_share' && txForm.type !== 'dividend'
})
function accountTypeLabel(type: string) {
  return ({ personal: 'شخصی', fund_share: 'سهم صندوق', sub_account: 'فرعی' } as any)[type] || type
}
async function load() { const id = Number(route.params.id); if (id) await store.fetchOne(id) }
onMounted(load)
watch(() => route.params.id, load)
async function handleCreateAccount() {
  if (!store.currentInvestor) return
  accSaving.value = true
  try {
    await store.createAccount({ investorId: store.currentInvestor.id, name: accForm.name, type: accForm.type, notes: accForm.notes || undefined })
    showAccountModal.value = false; accForm.name = ''; accForm.type = 'personal'; accForm.notes = ''
  } catch (e: any) { alert(e.message || 'خطا') }
  finally { accSaving.value = false }
}
async function handleCreateVal() {
  if (!valForm.accountId) return
  valSaving.value = true
  try {
    await api.valuations.create({ accountId: Number(valForm.accountId), marketValue: valForm.marketValue, date: valForm.date })
    await load()
    alert('ارزش‌گذاری ثبت شد')
  } catch (e: any) { alert(e.message || 'خطا') }
  finally { valSaving.value = false }
}
async function handleCreateTx() {
  if (!txForm.accountId || !txForm.amount) return
  txSaving.value = true
  try {
    await txStore.create({ accountId: Number(txForm.accountId), type: txForm.type, amount: txForm.amount, units: needsUnits.value ? txForm.units : undefined, date: txForm.date, description: txForm.description || undefined })
    txForm.amount = 0; txForm.units = 0; txForm.description = ''; alert('تراکنش ثبت شد')
  } catch (e: any) { alert(e.message || 'خطا') }
  finally { txSaving.value = false }
}
</script>
<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
.page-header h2 { margin: 0.25rem 0 0; font-size: 1.4rem; }
.back-link { font-size: 0.85rem; color: #64748b; text-decoration: none; }
.relation { color: #64748b; font-size: 0.9rem; margin: 0.15rem 0 0; }
h3 { font-size: 1.05rem; margin: 0; }
.type-badge { background: #e0e7ff; color: #3730a3; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
.tx-form { margin-top: 1rem; }
.form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem; }
.form-group { margin-bottom: 0.75rem; }
.form-group label { display: block; margin-bottom: 0.3rem; font-size: 0.85rem; color: #475569; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.5rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 0.9rem; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 400px; }
.modal h3 { margin-bottom: 1.25rem; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
</style>
