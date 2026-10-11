# مدیریت صندوق سبدگردانی

برنامه دسکتاپ برای مدیریت صندوق سبدگردانی.

## تکنولوژی‌ها
- Electron + Vue 3 + TypeScript
- Pinia + SQLite (better-sqlite3) + Drizzle ORM
- Decimal.js برای محاسبات مالی

## راه‌اندازی
```bash
npm install
npm run db:init
npm run dev
```

## ساختار
```
portfolio-manager/
├── electron/     # Main + Preload + IPC
├── src/          # Vue frontend
├── database/     # Schema
├── scripts/      # Init scripts
└── storage/      # SQLite + reports
```

## وضعیت
- [x] مدل دیتابیس و منطق محاسبات
- [x] لایه IPC کامل
- [x] صفحات سرمایه‌گذاران، جزئیات، تراکنش‌ها، تنظیمات
- [ ] گزارش PDF
- [ ] مهاجرت از اکسل
