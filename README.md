# صندوق سبدگردانی خانوادگی (AdonisJS 7 + SQLite)

قدم اول: ورود با نقش (مدیر / فقط‌مشاهده)، دیتابیس، دادهٔ اولیه از اکسل، ماژول محاسبات تست‌شده، و صفحه‌های خلاصه، سرمایه‌گذاران، تراکنش‌ها و تنظیمات.

## اجرا روی ویندوز

۱. **Node.js 24 (LTS)** را از nodejs.org نصب کنید. (AdonisJS 7 به Node 24 یا بالاتر نیاز دارد.)
۲. پوشه را از حالت zip درآورید و در PowerShell داخلش بروید:

```powershell
npm install
copy .env.example .env
node ace generate:key
node ace codegen
node ace migration:run
node ace db:seed
npm run dev
```

۳. مرورگر: http://localhost:3333
   ورود اولیه: `admin@example.com` / `ChangeMe-123`
   (پیش از `db:seed` می‌توانید `ADMIN_EMAIL` و `ADMIN_PASSWORD` را در `.env` عوض کنید.)

## تست

```powershell
node ace test unit
```

تست‌ها با اعداد خود اکسل نوشته شده‌اند (NAV برابر ۲۲٬۲۹۲٫۱۸۸۷ و کارمزد ۲۰۱٬۷۰۰٬۰۰۰ ریال).

## ساختار

- `app/services/fund_calculator.ts`: محاسبات خالص (بدون دیتابیس)، عیناً از اکسل
- `app/services/fund_state.ts`: ساخت وضعیت دوره از روی دیتابیس و تراکنش‌ها
- `database/migrations`: جدول‌ها (`users` با `role`, `periods`, `investors`, `transactions`, `personal_accounts`)
- `database/schema.ts`: کلاس‌های مدل که Lucid از روی migrationها می‌سازد (دستی ویرایش نکنید)
- `database/seeders/main_seeder.ts`: دادهٔ اولیه از اکسل
- دیتابیس: فایل `tmp/db.sqlite3` (برای پشتیبان‌گیری همین فایل را کپی کنید)

## نکته‌های طراحی

- واریز، برداشت و ارزش روز از روی تراکنش‌ها ساخته می‌شوند. تراکنش ثبت‌شده ویرایش‌پذیر نیست؛ اصلاح با تراکنش معکوس.
- واحدها `double` هستند (مثل اکسل). مبلغ‌ها ریال صحیح‌اند.
- رفتارهای خود اکسل عمداً حفظ شده: سود نقدی دوبار در سود ناخالص، و تفاوت نرخ‌های صندوق و حساب شخصی.
