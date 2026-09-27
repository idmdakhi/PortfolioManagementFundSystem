# Architecture

## هدف
سیستم مدیریت پورتفوی صندوق با معماری ماژولار، قابل توسعه، تست‌پذیر و قابل ردیابی. منطق مالی از UI و زیرساخت جدا بماند.

## وضعیت فعلی (Implemented)
پروژه بر پایه **AdonisJS v7** با **Lucid ORM** و **SQLite** پیاده‌سازی شده. معماری لایه‌بندی شده هدف (Clean Architecture) در فازهای آینده کامل می‌شود.

## معماری فعلی (AdonisJS Standard)
```
Presentation (Controllers) → Services (Domain Logic) → Models (Lucid ORM) → Database (SQLite)
```

| لایه | محل کد | توضیح |
|------|--------|-------|
| **Presentation** | `app/controllers/` | کنترلرهای HTTP، اعتبارسنجی، تبدیل درخواست |
| **Application/Services** | `app/services/` | منطق دامنه: NavEngine، GroupAllocator، FeeEngine |
| **Domain/Models** | `app/models/` | موجودیت‌های Lucid: Person، Group، FundTransaction، PersonalTransaction، GroupTransaction، AnnualSnapshot |
| **Infrastructure** | `config/`, `database/`, `start/` | پیکربندی، مایگریشن‌ها، سیدرها، پروایدرها |
| **Database** | SQLite (`better-sqlite3`) | جداول: groups, people, fund_transactions, personal_transactions, group_transactions, annual_snapshots, users, access_tokens |

## ماژول‌های پیاده‌سازی‌شده
- **People & Groups** — مدیریت اشخاص و گروه‌ها (`Person`, `Group`)
- **Fund Transactions** — تراکنش‌های صندوق (`FundTransaction`: buy_units, sell_units, mark_to_market, adjustment)
- **Personal Transactions** — تراکنش‌های حساب شخصی (`PersonalTransaction`: deposit, withdraw, mark_to_market, adjustment)
- **Group Transactions** — تراکنش‌های گروهی با تخصیص (`GroupTransaction`: income, expense, deposit, withdraw, adjustment)
- **Valuation (NAV)** — محاسبه واحد و NAV صندوق (`NavEngine`)
- **Fee Calculation** — موتور محاسبه کارمزد (`FeeEngine`)
- **Group Allocation** — تقسیم تراکنش گروهی (`GroupAllocator`)
- **Auth & Access** — احراز هویت (session/token) با AdonisJS Auth

## ماژول‌های **نپیاده‌سازی‌شده** (Planned)
- **Ledger** — دفتر الأستاذ نامتغیر (append-only)
- **Assets & Holdings** — دارایی‌ها و هولدینگ‌ها
- **Valuation Snapshots** — اسنپ‌شات روزانه ارزش‌گذاری کامل
- **Fee Rules & Settlement** — قوانین کارمزد، محاسبه و تسویه
- **Reports** — گزارش‌گیری پیشرفته
- **Audit Log** — لاگ حسابرسی کامل
- **Migration/Import** — ورود داده از Excel

## قواعد معماری (Target - برای توسعه آینده)
1. Domain به Infrastructure وابسته نباشد (वारونگی وابستگی).
2. عملیات مالی atomic باشد (database transaction).
3. تراکنش posted حذف فیزیکی نشود؛ اصلاح با reversal/adjustment.
4. مبلغ مالی با decimal/fixed precision محاسبه شود (در حال حاضر `number` استفاده شده — باید به `decimal.js` یا `bigint` مهاجر شود).
5. `effectiveDate` (تاریخ اثر مالی) از `createdAt` (زمان ثبت) جدا باشد.
6. عملیات حساس audit شود.
7. UI منبع حقیقت مالی نیست؛ Domain/Ledger منبع حقیقت است.

## جریان درخواست (Actual)
```
HTTP Request → Validate (VineJS) → Authorize (Auth Middleware) → Controller → Service (Domain Logic) → Model (Lucid) → Database Transaction → Response
```

## تکنولوژی‌ها
- **Framework**: AdonisJS v7 (Node.js, TypeScript)
- **ORM**: Lucid (Active Record pattern)
- **Database**: SQLite (better-sqlite3) — توسعه/تست؛ قابل مهاجرت به PostgreSQL
- **Validation**: VineJS
- **Auth**: AdonisJS Auth (session + API tokens)
- **Date/Time**: Luxon
- **Testing**: Japa (unit/integration)
- **Lint/Format**: ESLint + Prettier
- **TypeCheck**: TypeScript strict mode