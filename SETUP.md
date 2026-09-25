# راهنمای راه‌اندازی اسکلت AdonisJS

## آنچه الان دارید

```
apps/api/
├── app/
│   ├── Models/          # Person, Group, Setting, Fund/Personal/GroupTransaction, AnnualSnapshot
│   └── Services/        # FeeEngine, NavEngine, GroupAllocator (+ تست)
├── database/
│   ├── migrations/      # 001 … 007
│   └── seeders/         # داده اولیه ۱۰ نفر و گروه‌ها
├── start/routes.ts      # نقشه مسیرهای API
└── package.json
```

موتورهای محاسبه **بدون Adonis** قابل تست‌اند:

```bash
node apps/api/app/Services/engines.mjs
```

## نصب کامل Adonis ۶ (روی سیستم خودتان)

```bash
# 1) ساخت پروژه رسمی Adonis (اگر از صفر می‌خواهید)
npm init adonisjs@latest fund-api -- -K=api --db=sqlite

# 2) یا داخل همین پوشه apps/api:
cd apps/api
npm i
# سپس فایل‌های Models / Services / migrations همین اسکلت را روی پروژه Adonis کپی کنید

# 3) تنظیم .env
# DB_CONNECTION=sqlite
# DB_DATABASE=database/fund.sqlite

# 4) migration + seed
node ace migration:run
node ace db:seed

# 5) اجرا
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

## قدم بعدی پیشنهادی

1. `PeopleController` + `GroupsController` (CRUD)
2. اتصال `GroupAllocator` به ثبت `GroupTransaction`
3. سرویس `PortfolioService` که از NavEngine + FeeEngine مانده هر نفر را می‌سازد
4. Endpoint داشبورد

## نکات مالی (قفل‌شده از اکسل)

- کارمزد منفی → صفر + سقف  
- گروهی فقط **تجدید سرمایه‌گذاری**  
- ارزش روز صندوق با نادیده گرفتن ردیف خالی  
- واحد = مبلغ ÷ baseUnitPrice  
