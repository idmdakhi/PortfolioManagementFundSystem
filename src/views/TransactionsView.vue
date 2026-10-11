<template>
  <div>
    <div class="page-header">
      <h2>تراکنش‌ها</h2>
      <div class="filters">
        <select v-model="filterType" @change="load">
          <option value="">همه انواع</option>
          <option value="deposit">واریز</option>
          <option value="withdraw">برداشت</option>
          <option value="dividend">سود نقدی</option>
          <option value="fee">کارمزد</option>
        </select>
        <button class="btn btn-secondary" @click="load">بروزرسانی</button>
      </div>
    </div>
    <div v-if="store.loading" class="card">در حال بارگذاری...</div>
    <div v-else class="card">
      <table class="table" v-if="store.transactions.length">
        <thead><tr><th>تاریخ</th><th>نوع</th><th>مبلغ (ریال)</th><th>واحد</th><th>توضیحات</th><th></th></tr></thead>
        <tbody>
          <tr v-for="tx in store.transactions" :key="tx.id">
            <td>{{ formatDate(tx.date) }}</td>
            <td><span :class="['type-tag', tx.type]">{{ typeLabel(tx.type) }}</span></td>
            <td class="number">{{ formatRial(tx.amount) }}</td>
            <td>{{ tx.units != null ? formatRial(tx.units) : '—' }}</td>
            <td>{{ tx.description || '—' }}</td>
            <td><button class="btn btn-danger btn-sm" :disabled="tx.amount < 0 || tx.relatedTransactionId != null" @click="handleReverse(tx.id)">برگشت</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else style="color:#64748b">تراکنشی یافت نشد.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTransactionsStore } from '../stores/transactions'
import { formatRial, formatDate } from '../services/api'
const store = useTransactionsStore()
const filterType = ref('')
function typeLabel(type: string) {
  return ({ deposit: 'واریز', withdraw: 'برداشت', dividend: 'سود نقدی', fee: 'کارمزد', transfer: 'انتقال', asset_sale: 'فروش دارایی' } as any)[type] || type
}
async function load() { await store.fetchList({ type: filterType.value || undefined, limit: 200 }) }
async function handleReverse(id: number) {
  if (!confirm('یک تراکنش برگشتی (معکوس) برای این تراکنش ثبت شود؟')) return
  try { await store.reverse(id) } catch (e: any) { alert(e.message || 'خطا') }
}
onMounted(load)
</script>
<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.page-header h2 { margin: 0; font-size: 1.4rem; }
.filters { display: flex; gap: 0.5rem; align-items: center; }
.filters select { padding: 0.4rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; }
.type-tag { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
.type-tag.deposit { background: #dcfce7; color: #166534; }
.type-tag.withdraw { background: #fee2e2; color: #991b1b; }
.type-tag.dividend { background: #dbeafe; color: #1e40af; }
.type-tag.fee { background: #fef3c7; color: #92400e; }
.btn-sm { padding: 0.25rem 0.55rem; font-size: 0.8rem; }
</style>
