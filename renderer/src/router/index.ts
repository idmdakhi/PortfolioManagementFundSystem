import { createRouter, createWebHashHistory } from 'vue-router'
import People from '@/pages/People.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', name: 'people', component: People }],
})
