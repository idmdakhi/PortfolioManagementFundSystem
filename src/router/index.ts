import { createRouter, createWebHashHistory } from 'vue-router'
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
    { path: '/investors', name: 'investors', component: () => import('../views/InvestorsView.vue') },
    { path: '/investors/:id', name: 'investor-detail', component: () => import('../views/InvestorDetailView.vue') },
    { path: '/transactions', name: 'transactions', component: () => import('../views/TransactionsView.vue') },
    { path: '/reports', name: 'reports', component: () => import('../views/ReportsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') }
  ]
})
export default router
