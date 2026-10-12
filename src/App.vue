<template>
  <div class="app" dir="rtl">
    <header class="app-header">
      <h1>مدیریت صندوق سبدگردانی</h1>
      <nav>
        <router-link to="/">داشبورد</router-link>
        <router-link to="/investors">سرمایه‌گذاران</router-link>
        <router-link to="/transactions">تراکنش‌ها</router-link>
        <router-link to="/periods">دوره‌ها</router-link>
        <router-link to="/reports">گزارش‌ها</router-link>
        <router-link to="/settings">تنظیمات</router-link>
      </nav>
    </header>
    <main class="app-main"><router-view /></main>
  </div>
</template>
<script setup lang="ts"></script>
<style>
.app { min-height: 100vh; display: flex; flex-direction: column; font-family: 'Vazirmatn', 'Tahoma', sans-serif; }
.app-header { background: #1e293b; color: white; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.app-header h1 { font-size: 1.25rem; margin: 0; font-weight: 600; }
.app-header nav { display: flex; gap: 1.25rem; }
.app-header nav a { color: #cbd5e1; text-decoration: none; font-size: 0.95rem; padding: 0.35rem 0.5rem; border-radius: 4px; transition: all 0.15s; }
.app-header nav a:hover, .app-header nav a.router-link-active { color: white; background: rgba(255,255,255,0.1); }
.app-main { flex: 1; padding: 1.5rem; background: #f1f5f9; }
</style>
