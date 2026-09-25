# TODO + Roadmap

## سیستم مدیریت صندوق سبدگردانی

**Electron.js + AdonisJS**

---

## انتخاب فنی پیشنهادی

| لایه                | پیشنهاد                   | دلیل                                                          |
| ------------------- | ------------------------- | ------------------------------------------------------------- |
| دسکتاپ              | **Electron**              | نصب روی ویندوز/مک، کار آفلاین، حس نرم‌افزار دسکتاپ            |
| بک‌اند              | **AdonisJS**              | Adonis: ساختار، ORM، Auth، Validation آماده — مناسب منطق مالی |
| دیتابیس             | **SQLite**                | سبک، فایل‌محور، مناسب دسکتاپ؛ بعداً قابل ارتقا                |
| فرانت داخل Electron | **Vue 3 ** + Tailwind     | داشبورد مدرن، جدول، نمودار                                    |
| گزارش/چاپ           | PDF (puppeteer یا pdfkit) | جایگزین چاپ A4 اکسل                                           |

**جمع‌بندی:** Electron (shell) + AdonisJS (API + منطق) + SQLite + Vue

---

## Roadmap (۶ فاز)

| فاز   | نام                      | مدت تقریبی | خروجی                             |
| ----- | ------------------------ | ---------- | --------------------------------- |
| **۰** | آماده‌سازی               | ۳–۵ روز    | اسکلت پروژه، Git، محیط اجرا       |
| **۱** | هسته داده و افراد        | ۱–۲ هفته   | CRUD افراد، گروه‌ها، تنظیمات      |
| **۲** | تراکنش‌ها و موتور محاسبه | ۲–۳ هفته   | صندوق، شخصی، گروهی، NAV، کارمزد   |
| **۳** | داشبورد و گزارش          | ۱–۲ هفته   | داشبورد یکپارچه/فردی، نمودار، PDF |
| **۴** | Electron و بسته‌بندی     | ۱ هفته     | نصب‌کننده ویندوز/مک، آفلاین       |
| **۵** | پایداری و امکانات اضافه  | مستمر      | بک‌آپ، قفل، چندسال، بهینه‌سازی    |

---

## TODO تفصیلی

### فاز ۰ — آماده‌سازی

- [ ] ساخت مونوریپو یا دو پروژه: `api` (Adonis) + `desktop` (Electron)
- [ ] انتخاب ORM (Lucid در Adonis) و اتصال SQLite
- [ ] ساختار پوشه‌ها: models / services / controllers / migrations
- [ ] تنظیم ESLint، Prettier، Git hooks
- [ ] تعریف متغیرهای محیطی (نرخ پیش‌فرض کارمزد، واحد پول، مسیر DB)

### فاز ۱ — هسته داده

- [ ] **Model: Person** — نام، گروه، نوع حساب (صندوق+شخصی / فقط شخصی)، نرخ مازاد، سقف کارمزد، وضعیت
- [ ] **Model: Group** — نام گروه + اعضای فعال
- [ ] **Model: Settings** — NAV پایه، نرخ ۲۰٪، نرخ ۱٪، سقف پیش‌فرض، سال مالی
- [ ] API: CRUD افراد و گروه‌ها
- [ ] Validation: نام یکتا، نرخ بین ۰ و ۱، سقف ≥ ۰
- [ ] Seed اولیه با ۱۰ نفر فعلی شما

### فاز ۲ — تراکنش و موتور محاسبه (قلب سیستم)

- [ ] **Model: FundTransaction** — خرید واحد / ابطال / ثبت ارزش روز / تعدیل
- [ ] **Model: PersonalTransaction** — واریز / برداشت / ثبت ارزش روز / تعدیل
- [ ] **Model: GroupTransaction** — درآمد / هزینه / واریز / برداشت + هدف (گروه یا افراد خاص) + روش تخصیص
- [ ] **Service: NavEngine**
  - آخرین ارزش روز صندوق (نادیده گرفتن مبلغ خالی)
  - واحد فعلی هر نفر
  - NAV = ارزش روز ÷ کل واحد
- [ ] **Service: FeeEngine**
  - سود ناخالص = ارزش فعلی − بهای تمام‌شده
  - سود ۲۰٪ ثابت مشتری
  - سهم مازاد = max(۰, …) × نرخ نفر
  - کارمزد نهایی = max(۰, min(ثابت+مازاد، سقف))
- [ ] **Service: GroupAllocator**
  - فقط **تجدید سرمایه‌گذاری** (نقدی حذف شده)
  - مساوی / درصدی / مبلغ ثابت
  - واحددار → افزایش بهای/واحد صندوق؛ فقط شخصی → بهای شخصی
- [ ] تست واحد برای FeeEngine و GroupAllocator با اعداد واقعی شما
- [ ] Endpointهای ثبت تراکنش + محاسبه زنده مانده

### فاز ۳ — داشبورد و گزارش

- [ ] **داشبورد یکپارچه:** KPI (AUM، NAV، کارمزد کل) + جدول همه افراد + خلاصه گروه‌ها
- [ ] **داشبورد فردی:** انتخاب نفر → صندوق + شخصی + کارمزد + لیست تراکنش‌ها
- [ ] نمودار رشد چندساله (از آرشیو سالانه)
- [ ] **Model: AnnualSnapshot** — آرشیو پایان سال (دکمه «بستن سال مالی»)
- [ ] خروجی PDF صورت‌حساب فردی (جایگزین چاپ A4)
- [ ] فیلتر تاریخ و سال مالی

### فاز ۴ — Electron

- [ ] پنجره اصلی Electron با بارگذاری UI (localhost در dev، فایل build در prod)
- [ ] اجرای Adonis به‌صورت process داخلی یا sidecar
- [ ] مسیر ثابت SQLite کنار اپ (userData)
- [ ] منوی فارسی: فایل، پشتیبان‌گیری، تنظیمات، خروج
- [ ] ساخت installer با electron-builder (Windows NSIS + Mac DMG)
- [ ] بررسی آفلاین کامل (بدون اینترنت)

### فاز ۵ — پایداری و بعدی

- [ ] پشتیبان‌گیری خودکار SQLite (کپی روزانه)
- [ ] قفل/رمز برای ورود به اپ (اختیاری)
- [ ] لاگ تغییرات مهم (audit)
- [ ] واردات از اکسل فعلی (یک‌بار migration داده)
- [ ] صادرات اکسل/CSV برای حسابدار
- [ ] (اختیاری) همگام‌سازی ابری یا چند دستگاه

---

## ساختار پیشنهادی پوشه

```
fund-manager/
├── apps/
│   ├── api/                 # AdonisJS
│   │   ├── app/Models/
│   │   ├── app/Services/    # NavEngine, FeeEngine, GroupAllocator
│   │   ├── app/Controllers/
│   │   ├── database/migrations/
│   │   └── start/routes.ts
│   └── desktop/             # Electron + Vue/React
│       ├── electron/
│       └── src/             # UI
├── packages/
│   └── shared/              # انواع مشترک، ثابت‌ها
└── README.md
```

---

## ریسک‌ها و نکات

- **منطق مالی را در Service نگه دارید** — نه در Controller و نه در فرانت؛ تست‌پذیر بماند.
- اعداد را با **عدد صحیح (ریال)** یا Decimal ذخیره کنید؛ از float خام پرهیز کنید.
- قبل از Electron، API را با Postman/Insomnia کامل تست کنید.
- دادهٔ اکسل فعلی را یک‌بار با اسکریپت Import وارد SQLite کنید تا از صفر شروع نکنید.

---

اگر بخواهید، مرحلهٔ بعد می‌توانم:

1. اسکلت Adonis + مدل‌ها و migrationها را بنویسم، یا
2. فقط **FeeEngine و GroupAllocator** را به‌صورت ماژول TypeScript مستقل طراحی کنم تا بعداً به هر بک‌اندی وصل شود.

ریپو را بررسی کردم. وضعیت واقعی با چک‌لیست‌های فعلی هم‌خوان نیست؛ نسخهٔ به‌روز این است:

---

## وضعیت فعلی ریپو (`develop`)

| بخش                                                                          | وضعیت                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| AdonisJS + SQLite + Auth                                                     | ✅ (`@adonisjs/core` 7، better-sqlite3، login/signup/profile) |
| Models (Person, Group, Setting, Fund/Personal/GroupTx, AnnualSnapshot, User) | ✅                                                            |
| Migrations 001–007 + users/tokens                                            | ✅                                                            |
| Services: FeeEngine, NavEngine, GroupAllocator                               | ✅ (فایل هست)                                                 |
| Controllers دامنه (People/Groups/Tx/Dashboard)                               | ❌ فقط Auth                                                   |
| Routes دامنه                                                                 | ❌ فقط `/api/v1/auth` و `account`                             |
| Seed واقعی ۱۰ نفر                                                            | ❓ باید چک شود                                                |
| Electron / UI                                                                | ❌                                                            |
| docs غنی                                                                     | ✅ ولی بعضی قوانین با توافق اکسل **تضاد** دارند               |

**تضاد مهم:** در `docs/BusinessRules.md` هنوز نوشته شده برای Target=Group فقط Cash و Reinvestment ممنوع است — در حالی که در اکسل و توافق نهایی **نقدی حذف شد** و گروهی فقط **تجدید سرمایه‌گذاری** است.

**ساختار README** هنوز از مونوریپو `apps/api` حرف می‌زند؛ ریپو در عمل **یک پروژه تخت Adonis** است.

---

## چک‌لیست اصلاح‌شده (هم‌راستا با ریپو + قوانین قفل‌شده)

### فاز ۰ — Foundation _(تقریباً تمام)_

- [x] اسکلت Adonis + SQLite
- [x] Auth پایه (User, AccessToken, signup/login)
- [x] Models دامنه
- [x] Migrations اصلی
- [x] FeeEngine / NavEngine / GroupAllocator (کد)
- [x] مستندات اولیه (`docs/`)
- [ ] **README و SETUP را با ساختار واقعی ریپو یکی کنید** (حذف `apps/api`)
- [ ] **BusinessRules.md را اصلاح کنید:** گروهی = فقط تجدید سرمایه‌گذاری؛ نقدی حذف
- [ ] Seed رسمی ۱۰ نفر + ۴ گروه + Settings پیش‌فرض
- [ ] تست خودکار موتورها در `node ace test` (نه فقط `engines.mjs`)
- [ ] `.env.example` کامل (DB، نرخ‌های پیش‌فرض)

### فاز ۱ — هسته داده (CRUD) — **اولویت بعدی**

- [ ] `PeopleController` + Validator + Routes
- [ ] `GroupsController` + Validator + Routes
- [ ] `SettingsController` (GET/PUT تک‌ردیفه)
- [ ] Transformer برای خروجی JSON تمیز
- [ ] تست API: ساخت/ویرایش شخص و گروه
- [ ] فقط اعضای `isActive` در تخصیص گروهی

### فاز ۲ — تراکنش‌ها + موتور زنده

- [ ] `FundTransactionsController`
  - buy / sell / mark_to_market / adjustment
  - mark_to_market با `personId = null`؛ مبلغ خالی در NAV نادیده
- [ ] `PersonalTransactionsController`
  - deposit / withdraw / mark_to_market / adjustment
- [ ] `GroupTransactionsController`
  - income / expense / deposit / withdraw / adjustment
  - target: group | specific_people
  - method: equal | percent | fixed
  - **همیشه reinvest** (بدون گزینه نقدی)
- [ ] `PortfolioService`
  - بهای صندوق، واحد، NAV، ارزش صندوق
  - بهای/ارزش شخصی
  - اعمال سهم گروهی روی صندوق یا شخصی بر اساس `accountType`
  - FeeEngine per person
- [ ] تراکنش DB atomic برای ثبت گروهی + اثر روی مانده‌ها
- [ ] تست یکپارچه با سناریوی اکسل (واریز ۴.۸B فامیل من → ۳×۱.۶B)

### فاز ۳ — داشبورد و آرشیو

- [ ] `GET /api/v1/dashboard/overview` — AUM، NAV، کارمزد کل، جدول افراد، خلاصه گروه‌ها
- [ ] `GET /api/v1/dashboard/people/:id` — جزئیات + تراکنش‌ها + کارمزد
- [ ] `POST /api/v1/year-end/close` → AnnualSnapshot
- [ ] تاریخچه چندساله از Snapshot
- [ ] (اختیاری MVP) خروجی PDF صورت‌حساب

### فاز ۴ — کیفیت و داده

- [ ] Import یک‌بار از اکسل فعلی (parser + preview + commit)
- [ ] Export CSV/Excel برای حسابدار
- [ ] Audit ساده برای تراکنش‌های posted (بدون حذف فیزیکی؛ adjustment/reversal)
- [ ] CI: lint + typecheck + test
- [ ] پول به‌صورت integer (ریال) یا decimal ثابت — نه float خام

### فاز ۵ — UI + Electron _(بعد از پایدار شدن API)_

- [ ] UI (Vue 3 + Tailwind یا Inertia اگر ترجیح می‌دهید داخل Adonis)
- [ ] صفحات: داشبورد، افراد، گروه‌ها، تراکنش‌ها، تنظیمات
- [ ] Electron shell + SQLite در `userData`
- [ ] بک‌آپ خودکار DB
- [ ] Installer ویندوز

---

## قوانین کسب‌وکار که باید در docs قفل شوند (جایگزین متن قدیمی)

```
1. کارمزد = max(0, min(1%×بهای + سهم‌مازاد، سقف))
   سهم‌مازاد = max(0, سودناخالص − 20%×بهای) × نرخ‌نفر
2. گروهی: فقط تجدید سرمایه‌گذاری
   - واحددار صندوق → بهای/واحد صندوق
   - فقط شخصی → بهای حساب شخصی
3. ارزش روز صندوق: آخرین مبلغ غیرخالی
4. تراکنش posted حذف نمی‌شود؛ اصلاح با adjustment
5. تخصیص گروهی: فقط اعضای فعال؛ جمع سهم‌ها = مبلغ کل
```

---

## اولویت پیشنهادی این هفته

1. اصلاح `BusinessRules.md` + README ساختار واقعی
2. Seed
3. CRUD People / Groups / Settings
4. Fund + Group transaction endpoints + PortfolioService
5. Dashboard overview

`PROJECT_CHECKLIST.md` فعلی خیلی enterprise است (LedgerEntry جدا، Holding، Rate versioning، RBAC کامل). برای محصول شما زود است؛ همان فازهای ۱–۳ بالا را منبع حقیقت قرار دهید و موارد Ledger/Reversal را فقط وقتی به audit رسمی نیاز داشتید اضافه کنید.

اگر بخواهید، متن آمادهٔ `BusinessRules.md` اصلاح‌شده یا اسکلت `PeopleController` + routes را برای پush روی `develop` می‌نویسم.
