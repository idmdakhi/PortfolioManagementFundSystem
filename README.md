# صندوق سبدگردانی خانوادگی — Fund Manager

AdonisJS 6 + SQLite (بعداً Electron برای دسکتاپ — فاز ۴)

## ساختار واقعی ریپو

این یک پروژهٔ **تخت AdonisJS** است (نه مونوریپو). همه‌چیز مستقیم زیر ریشهٔ ریپو قرار دارد:

```
.
├── app/
│   ├── controllers/     # فقط Auth فعلاً (access_tokens, new_account, profile)
│   ├── models/          # Person, Group, Setting, Fund/Personal/GroupTransaction, AnnualSnapshot, User
│   ├── services/        # FeeEngine, NavEngine, GroupAllocator (+ engines.mjs قابل اجرا با node خالص)
│   ├── middleware/
│   ├── exceptions/
│   └── validators/
├── database/
│   ├── migrations/      # 001–007 دامنه + جداول users/access_tokens
│   └── seeders/         # main_seeder.ts — ۱۰ نفر و ۴ گروه توافق‌شده
├── start/routes.ts       # فقط /api/v1/auth و /api/v1/account فعال؛ بقیه در routeMap مستندشده
├── config/
├── tests/
└── docs/                 # Architecture, BusinessRules, DataModel, Fees, ...
```

## شروع سریع

```bash
npm install
node ace migration:run
node ace db:seed
npm run dev
```

سرور روی `http://127.0.0.1:3333` بالا می‌آید.

موتورهای محاسبه را بدون AdonisJS هم می‌شود مستقیم تست کرد:

```bash
node app/services/engines.mjs
```

## وضعیت فازها

| فاز | وضعیت |
|-----|--------|
| ۰ اسکلت + مدل + migration + Auth | ✅ |
| ۱ CRUD افراد/گروه‌ها/تنظیمات | ❌ در دست ساخت |
| ۲ Controllerهای تراکنش + PortfolioService | ❌ |
| ۳ داشبورد و PDF | ❌ |
| ۴ Electron | ❌ |

جزئیات کامل: [`docs/todo.md`](docs/todo.md) و [`docs/PROJECT_CHECKLIST.md`](docs/PROJECT_CHECKLIST.md).

## قوانین مالی قفل‌شده (خلاصه)

- کارمزد = `max(0, min(۱٪×بهای + سهم‌مازاد, سقف))`؛ سهم‌مازاد = `max(0, سودناخالص − ۲۰٪×بهای) × نرخ‌نفر`.
- تراکنش گروهی **همیشه تجدید سرمایه‌گذاری** است؛ حالت «نقدی» در این سیستم وجود ندارد (بر خلاف نسخهٔ اکسل).
- ارزش روز صندوق = آخرین مقدار غیرخالی ثبت‌شده.
- تراکنش posted حذف نمی‌شود؛ اصلاح فقط با `adjustment` یا reversal.

جزئیات کامل در [`docs/BusinessRules.md`](docs/BusinessRules.md) و [`docs/Fees.md`](docs/Fees.md).
