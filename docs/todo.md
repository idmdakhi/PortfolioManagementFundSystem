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
- [x] **README و SETUP با ساختار واقعی ریپو یکی شد** (حذف `apps/api`، اصلاح casing `models/services`)
- [x] **BusinessRules.md اصلاح شد:** گروهی = فقط تجدید سرمایه‌گذاری؛ نقدی حذف (هم‌راستا با کد `group_allocator.ts`)
- [x] **باگ Seed برطرف شد:** نام گروه `خانواده‌ من`/`خانواده‌ همسر` → `فامیل من`/`فامیل همسر` (هم‌راستا با توافق اکسل)
- [x] **باگ Seed برطرف شد:** `همسر` با `isActive: false` بود بدون دلیل مستند — به `true` تغییر کرد
- [x] **باگ بحرانی رفع شد:** `docs/Testing.md` سناریوی طلایی را برعکس نوشته بود (Group+Reinvestment را validation error می‌دانست) — اصلاح شد
- [x] **باگ اجرایی رفع شد:** مسیر importهای `tests/engines.spec.ts` غلط بود (`../../` به‌جای `../`) — تست‌ها را واقعاً اجرا کردم، الان هر ۸ assertion پاس می‌شود
- [x] **تناقض باقی‌مانده رفع شد:** ارجاع‌های stale به `effectType`/`target-effect` در `Migration.md` و `Transactions.md`
- [x] **بنر دو-لایگی مستندات** به `docs/README.md` اضافه شد (enterprise-aspirational در برابر منبع حقیقت فعلی)
- [x] **Seed واقعاً به `BaseSeeder` وصل شد** و با `node ace db:seed` روی DB واقعی اجرا و تأیید شد (نه فقط آرایهٔ export‌شده)
- [x] **همهٔ ۷ migration دامنه واقعاً روی SQLite اجرا شدند** (`node ace migration:run` — موفق، صفر خطا) + rollback هر دو migration جدید هم تست شد
- [x] **ریسک `people.name UNIQUE` رفع شد:** migration جدید آن را برداشت و index معمولی جایگزین کرد
- [x] **ریسک نبود ستون reversal رفع شد:** `status`/`reversed_at`/`reversal_of_id` به هر سه جدول تراکنشی اضافه شد (تا وعدهٔ BusinessRules.md واقعاً قابل‌اجرا باشد)
- [x] **ریسک عدم اعتبارسنجی target/method رفع شد:** یک `@beforeSave` hook روی `GroupTransaction` اضافه شد که `group+equal` را می‌پذیرد و `group+percent` یا `group` بدون `groupId` را رد می‌کند — با یک ace command موقت واقعاً تست شد (۳ سناریو، هر سه درست عمل کردند)
- [ ] تست خودکار موتورها در `node ace test` (Japa) — فعلاً فقط اسکریپت مستقل `engines.spec.ts`
- [ ] `.env.example` کامل (نرخ‌های پیش‌فرض هنوز آن‌جا نیستند)

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
  - method: equal (group) | equal/percent/fixed (specific)
  - **همیشه reinvest** (بدون گزینه نقدی) — طبق `BusinessRules.md` اصلاح‌شده
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

## قوانین کسب‌وکار که در docs قفل شد

```
1. کارمزد = max(0, min(1%×بهای + سهم‌مازاد، سقف))
   سهم‌مازاد = max(0, سودناخالص − 20%×بهای) × نرخ‌نفر
2. گروهی: فقط تجدید سرمایه‌گذاری (بدون حالت نقدی)
   - واحددار صندوق → بهای/واحد صندوق
   - فقط شخصی → بهای حساب شخصی
3. ارزش روز صندوق: آخرین مبلغ غیرخالی
4. تراکنش posted حذف نمی‌شود؛ اصلاح با adjustment
5. تخصیص گروهی: فقط اعضای فعال؛ جمع سهم‌ها = مبلغ کل
```

---

## این نوبت چه چیزی اصلاح شد (commit بعدی)

**نوبت اول (مستندات + seed):**

| فایل | تغییر |
|---|---|
| `docs/BusinessRules.md` | تناقض Cash/Reinvestment برای Target=Group رفع شد؛ حالا با کد `group_allocator.ts` هم‌راستاست |
| `README.md` | ساختار مونوریپو (`apps/api`) حذف شد؛ ساختار تخت واقعی جایگزین شد |
| `SETUP.md` | مسیرها و casing (`app/models` نه `app/Models`) اصلاح شد |
| `database/seeders/main_seeder.ts` | نام گروه‌ها با توافق اکسل هم‌راستا شد؛ باگ `همسر: isActive:false` رفع شد |

**نوبت دوم (بازبینی کامل کد — نه فقط مستندات):**

| فایل | تغییر |
|---|---|
| `tests/engines.spec.ts` | مسیر import خراب (`../../`) اصلاح شد؛ با اجرای واقعی تأیید شد |
| `docs/Testing.md` | سناریوی طلایی برعکس بود (Group+Reinvestment=error) — اصلاح شد |
| `docs/Migration.md`, `docs/Transactions.md` | ارجاع stale به `effectType` حذف شد |
| `docs/README.md` | بنر دو-لایگی مستندات (واقعی در برابر enterprise-aspirational) اضافه شد |

**نوبت سوم (رفع ریسک‌ها با اجرای واقعی روی DB):**

| فایل | تغییر |
|---|---|
| `database/seeders/main_seeder.ts` | کلاس `MainSeeder extends BaseSeeder` اضافه شد؛ با `node ace db:seed` روی DB واقعی تست شد |
| `database/migrations/*_alter_people_drop_unique_name.ts` | UNIQUE از `people.name` برداشته شد (ریسک هم‌نامی)؛ اجرا و rollback تست شد |
| `database/migrations/*_alter_transactions_add_reversal_columns.ts` | ستون‌های `status`/`reversed_at`/`reversal_of_id` به هر ۳ جدول تراکنشی اضافه شد |
| `app/models/{fund,personal,group}_transaction.ts` | فیلدهای reversal اضافه شد؛ `GroupTransaction` یک `@beforeSave` hook گرفت که ناسازگاری target/method را رد می‌کند (با ace command موقت تست و تأیید شد، سپس حذف شد) |

همهٔ موارد بالا **واقعاً اجرا شدند** (نه فقط نوشته شدند): `npm install` (با `--nodedir=/usr` برای دور زدن نبود دسترسی شبکه به nodejs.org)، `node ace migration:run`، `node ace db:seed`، کوئری مستقیم SQLite برای تأیید داده، و یک ace command موقت برای تست hook مدل.

**نوبت چهارم (ادغام Electron — واقعاً پیاده‌سازی و با GUI واقعی تست شد):**

| چیز | نتیجه |
|---|---|
| معماری | Adonis درون همان پروسس Electron بوت می‌شود (بدون HTTP)؛ IPC = Controller |
| `electron/main.ts` + `preload.cts` + `ipc/{people,groups}.ts` | نوشته و کامپایل شد |
| `renderer/` (Vue 3 + Tailwind v4 + Vite) | صفحهٔ افراد (CRUD کامل) ساخته شد |
| باگ کشف‌شده | preload با ESM خام کار نمی‌کرد → به `.cts`/CommonJS تغییر کرد |
| باگ کشف‌شده | `config/database.ts` اصلاً `DB_PATH` را نمی‌خواند → اصلاح شد |
| باگ کشف‌شده | فایل‌های `.js` باقی‌مانده در `app/models/` باعث resolve شدن به مدل‌های خالی شدند → پاک شد + `.gitignore` سخت‌گیرتر شد |
| باگ کشف‌شده | `import type ... from '../Models/...'` (حرف بزرگ غلط) فقط زیر `tsc` واقعی لو رفت، نه زیر strip-types | 
| باگ کشف‌شده | تایپ ضعیف `seedPeople` (`accountType: string` به‌جای union) — `node ace build` واقعی آن را گرفت |
| تست نهایی | Electron واقعی زیر Xvfb اجرا شد؛ Vue بارگذاری شد؛ IPC واقعی صدا خورد؛ نتیجه از SQLite واقعی برگشت: `{peopleCount:10, firstName:"خودم", groupsCount:4}` |

جزئیات کامل: [`docs/Electron.md`](Electron.md)

## اولویت پیشنهادی این هفته

1. ~~اصلاح `BusinessRules.md` + README ساختار واقعی~~ ✅
2. ~~وصل کردن Seed واقعی به `node ace db:seed`~~ ✅
3. ~~برش عمودی Electron (افراد + گروه‌ها، CRUD کامل، تست با GUI واقعی)~~ ✅
4. همان الگو را برای تراکنش‌های صندوق/شخصی/گروهی و تنظیمات تکرار کنید
5. صفحهٔ داشبورد (overview + فردی) در Vue + کارمزد
6. آیکون واقعی اپ + تست واقعی `electron:pack` روی ویندوز (در این سندباکس قابل تست نبود)

`PROJECT_CHECKLIST.md` فعلی خیلی enterprise است (LedgerEntry جدا، Holding، Rate versioning، RBAC کامل). برای محصول شما زود است؛ همان فازهای ۱–۳ بالا را منبع حقیقت قرار دهید و موارد Ledger/Reversal را فقط وقتی به audit رسمی نیاز داشتید اضافه کنید.

اگر بخواهید، مرحلهٔ بعد می‌توانم اسکلت `PeopleController` + `GroupsController` + routes واقعی را برای فاز ۱ بنویسم.
