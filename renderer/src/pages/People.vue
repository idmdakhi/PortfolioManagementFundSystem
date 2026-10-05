<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { PersonRecord, GroupRecord } from '@/types/window'

const people = ref<PersonRecord[]>([])
const groups = ref<GroupRecord[]>([])
const loading = ref(true)
const errorMsg = ref('')

const form = ref({
  name: '',
  groupId: null as number | null,
  accountType: 'personal_only' as 'fund_and_personal' | 'personal_only',
  excessFeeRate: 0.2,
  feeCap: 1_000_000_000,
})

async function refresh() {
  loading.value = true
  try {
    const [p, g] = await Promise.all([window.api.people.list(), window.api.groups.list()])
    people.value = p
    groups.value = g
  } finally {
    loading.value = false
  }
}

async function addPerson() {
  errorMsg.value = ''
  if (!form.value.name.trim()) {
    errorMsg.value = 'نام را وارد کنید.'
    return
  }
  try {
    await window.api.people.create({ ...form.value, isActive: true })
    form.value.name = ''
    await refresh()
  } catch (e) {
    errorMsg.value = (e as Error).message
  }
}

async function toggleActive(p: PersonRecord) {
  await window.api.people.update(p.id, { isActive: !p.isActive })
  await refresh()
}

async function removePerson(p: PersonRecord) {
  errorMsg.value = ''
  if (!confirm(`«${p.name}» حذف شود؟`)) return
  try {
    await window.api.people.remove(p.id)
    await refresh()
  } catch (e) {
    errorMsg.value = (e as Error).message
  }
}

onMounted(refresh)
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <section class="bg-white rounded-xl shadow p-5">
      <h2 class="font-bold text-slate-800 mb-4">افزودن فرد جدید</h2>
      <div class="grid grid-cols-2 gap-4">
        <label class="flex flex-col gap-1 text-sm">
          نام
          <input v-model="form.name" class="border rounded px-3 py-2" placeholder="مثلاً امینه (خاله)" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          گروه
          <select v-model="form.groupId" class="border rounded px-3 py-2">
            <option :value="null">— بدون گروه —</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          نوع حساب
          <select v-model="form.accountType" class="border rounded px-3 py-2">
            <option value="fund_and_personal">صندوق + شخصی</option>
            <option value="personal_only">فقط شخصی</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          نرخ سهم مازاد کارمزد
          <input v-model.number="form.excessFeeRate" type="number" step="0.01" class="border rounded px-3 py-2" />
        </label>
      </div>
      <p v-if="errorMsg" class="text-red-600 text-sm mt-3">{{ errorMsg }}</p>
      <button @click="addPerson" class="mt-4 bg-slate-900 text-white rounded px-4 py-2 text-sm">
        افزودن
      </button>
    </section>

    <section class="bg-white rounded-xl shadow p-5">
      <h2 class="font-bold text-slate-800 mb-4">لیست افراد</h2>
      <p v-if="loading" class="text-slate-500 text-sm">در حال بارگذاری…</p>
      <table v-else class="w-full text-sm text-right">
        <thead class="text-slate-500 border-b">
          <tr>
            <th class="py-2">نام</th>
            <th>گروه</th>
            <th>نوع حساب</th>
            <th>وضعیت</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in people" :key="p.id" class="border-b last:border-0">
            <td class="py-2">{{ p.name }}</td>
            <td>{{ p.group?.name ?? '—' }}</td>
            <td>{{ p.accountType === 'fund_and_personal' ? 'صندوق + شخصی' : 'فقط شخصی' }}</td>
            <td>
              <button
                @click="toggleActive(p)"
                :class="p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                class="rounded-full px-3 py-1 text-xs"
              >
                {{ p.isActive ? 'فعال' : 'غیرفعال' }}
              </button>
            </td>
            <td class="text-left">
              <button @click="removePerson(p)" class="text-red-600 text-xs">حذف</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
