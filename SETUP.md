# راهنمای راه‌اندازی

## آنچه الان دارید (ساختار واقعی، تخت — نه apps/api)

```
.
├── app/
│   ├── models/          # Person, Group, Setting, Fund/Personal/GroupTransaction, AnnualSnapshot
│   └── services/        # FeeEngine, NavEngine, GroupAllocator (+ engines.mjs)
├── database/
│   ├── migrations/      # 001 … 007
│   └── seeders/         # داده اولیه ۱۰ نفر و ۴ گروه
├── start/routes.ts      # نقشه مسیرهای API (فعلاً فقط auth فعال است)
└── package.json
```

> نکته: پوشه‌ها با حروف کوچک هستند (`app/models`, `app/services`) — نه `Models`/`Services`.
> روی سیستم‌فایل حساس به حروف (لینوکس/CI) این فرق مهم است.

موتورهای محاسبه **بدون AdonisJS** قابل تست‌اند:

```bash
node app/services/engines.mjs
```

## نصب و اجرا

```bash
npm install
cp .env.example .env
node ace migration:run
node ace db:seed
npm run dev
```

## ترتیب migration

1. groups
2. people
3. settings
4. fund_transactions
5. personal_transactions
6. group_transactions
7. annual_snapshots

(به‌علاوهٔ migrationهای users/access_tokens که با تاریخ timestamp نام‌گذاری شده‌اند.)

## قدم بعدی پیشنهادی

1. `PeopleController` + `GroupsController` + `SettingsController` (CRUD) + routes واقعی
2. اتصال `GroupAllocator` به ثبت `GroupTransaction`
3. سرویس `PortfolioService` که از `NavEngine` + `FeeEngine` مانده هر نفر را می‌سازد
4. Endpointهای داشبورد (`overview`, `person/:id`)

## نکات مالی (قفل‌شده از اکسل)

- کارمزد منفی → صفر؛ همیشه سقف‌دار.
- تراکنش گروهی **فقط تجدید سرمایه‌گذاری** — حالت نقدی وجود ندارد.
- ارزش روز صندوق = آخرین مقدار غیرخالی ثبت‌شده؛ ردیف با مبلغ خالی نادیده گرفته می‌شود.
- واحد = مبلغ ÷ `baseUnitPrice` (پیش‌فرض تنظیمات، نه NAV لحظه‌ای — برای جلوگیری از وابستگی حلقوی).
