<template>
  <div>
    <div class="page-header">
      <h2>سرمایه‌گذاران</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">+ افزودن سرمایه‌گذار</button>
    </div>
    <div v-if="store.loading" class="card">در حال بارگذاری...</div>
    <div v-else-if="store.error" class="card" style="color:#dc2626">{{ store.error }}</div>
    <div v-else class="card">
      <table class="table" v-if="store.investors.length">
        <thead><tr><th>نام</th><th>نسبت</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>
          <tr v-for="inv in store.investors" :key="inv.id">
            <td><router-link :to="`/investors/${inv.id}`" class="link">{{ inv.name }}</router-link></td>
            <td>{{ inv.relation || '—' }}</td>
            <td><span :class="inv.isActive ? 'badge-active' : 'badge-inactive'">{{ inv.isActive ? 'فعال' : 'غیرفعال' }}</span></td>
            <td class="actions">
              <router-link :to="`/investors/${inv.id}`" class="btn btn-secondary btn-sm">مشاهده</router-link>
              <button class="btn btn-secondary btn-sm" @click="openEdit(inv)">ویرایش</button>
              <button v-if="inv.isActive" class="btn btn-danger btn-sm" @click="handleDeactivate(inv)">غیرفعال</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else style="color:#64748b">هنوز سرمایه‌گذاری ثبت نشده است.</p>
    </div>
    <div v-if="showCreateModal || editing" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editing ? 'ویرایش سرمایه‌گذار' : 'افزودن سرمایه‌گذار جدید' }}</h3>
        <form @submit.prevent="handleSubmit">
          <div class="form-group"><label>نام *</label><input v-model="form.name" required /></div>
          <div class="form-group"><label>نسبت</label><input v-model="form.relation" placeholder="برادر، خاله، مادر..." /></div>
          <div class="form-group"><label>توضیحات</label><textarea v-model="form.notes" rows="3"></textarea></div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">انصراف</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? '...' : 'ذخیره' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useInvestorsStore } from '../stores/investors'
import type { Investor } from '../types'
const store = useInvestorsStore()
const showCreateModal = ref(false)
const editing = ref<Investor | null>(null)
const saving = ref(false)
const form = reactive({ name: '', relation: '', notes: '' })
onMounted(() => store.fetchAll())
function openEdit(inv: Investor) {
  editing.value = inv; form.name = inv.name; form.relation = inv.relation || ''; form.notes = inv.notes || ''
}
function closeModal() {
  showCreateModal.value = false; editing.value = null; form.name = ''; form.relation = ''; form.notes = ''
}
async function handleSubmit() {
  saving.value = true
  try {
    if (editing.value) await store.update(editing.value.id, { name: form.name, relation: form.relation || undefined, notes: form.notes || undefined })
    else await store.create({ name: form.name, relation: form.relation || undefined, notes: form.notes || undefined })
    closeModal()
  } catch (e: any) { alert(e.message || 'خطا') }
  finally { saving.value = false }
}
async function handleDeactivate(inv: Investor) {
  if (!confirm(`غیرفعال کردن «${inv.name}»؟`)) return
  await store.deactivate(inv.id)
}
</script>
<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.page-header h2 { margin: 0; font-size: 1.4rem; }
.link { color: #2563eb; text-decoration: none; font-weight: 500; }
.badge-active { background: #dcfce7; color: #166534; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.8rem; }
.badge-inactive { background: #f1f5f9; color: #64748b; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.8rem; }
.actions { display: flex; gap: 0.4rem; }
.btn-sm { padding: 0.3rem 0.65rem; font-size: 0.8rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 420px; }
.modal h3 { margin: 0 0 1.25rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.35rem; font-size: 0.9rem; color: #475569; font-weight: 500; }
.form-group input, .form-group textarea { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 0.95rem; }
.form-group input:focus, .form-group textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
.form-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.25rem; }
</style>
