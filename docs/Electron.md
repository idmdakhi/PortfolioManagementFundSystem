# ادغام Electron

> این سند نتیجهٔ یک جلسهٔ کامل پیاده‌سازی + تست واقعی است (نه فقط طراحی روی کاغذ).
> همه‌چیز زیر واقعاً اجرا و تأیید شده: build کامل، migration روی DB واقعی، و یک اجرای
> End-to-End واقعی Electron زیر Xvfb که IPC را تا SQLite و برگشت صدا زد.

## معماری انتخابی: بدون HTTP

برخلاف پیشنهاد اولیهٔ من (سرور HTTP داخلی جدا)، تصمیم نهایی این بود که AdonisJS
**درون همان پروسس اصلی Electron** بوت شود — بدون هیچ `listen()` روی پورتی.

```
Vue (renderer, بدون دسترسی Node)
   │  window.api.people.list()  — از طریق preload.cjs (contextBridge)
   ▼
ipcRenderer.invoke('people:list')
   ▼
electron/main.ts  (main process)
   │  ipcMain.handle('people:list', ...) → مستقیم import('#models/person')
   ▼
AdonisJS / Lucid ORM  (بوت‌شده بدون HTTP — دقیقاً مثل یک ace command)
   ▼
SQLite (better-sqlite3)
```

IPC handlerها (`electron/ipc/*.ts`) نقش Controller را بازی می‌کنند؛ چون هرگز
درخواست HTTP نمی‌آید، PeopleController/route جداگانه لازم نیست.

## نکات فنی که در عمل کشف شدند

### ۱. preload باید CommonJS باشد (`.cts` → `.cjs`)
پروژه `"type": "module"` است (برای AdonisJS)، اما Electron به preload با
`import` خام ES Module اعتماد نمی‌کند — در تست واقعی، `window.api` در renderer
`undefined` می‌ماند بدون هیچ خطای واضحی در کنسول main process (فقط یک
`UnhandledPromiseRejectionWarning` گنگ در سمت renderer). راه‌حل: `electron/preload.cts`
(نه `.ts`) — پسوند `.cts` به TypeScript می‌گوید این فایل مستقل از تنظیم کلی پروژه
همیشه CommonJS کامپایل شود (`require`, نه `import`)، و خروجی خودکار `preload.cjs` می‌شود.

### ۲. مسیر خروجی کامپایل Electron باید داخل `build/` باشد، نه کنارش
اگر `electron/*.ts` به یک پوشهٔ جدا (مثلاً `build-electron/`) کامپایل شود، آلیاس‌های
`#models/*` دیگر درست resolve نمی‌شوند — چون Node این آلیاس‌ها را از روی نزدیک‌ترین
`package.json` به فایل importکننده حل می‌کند، و `build/package.json` (کپی‌شده توسط
`node ace build`) تنها جایی‌ست که نقشهٔ `#models/* → ./app/models/*.js` را دارد و
همزمان `app/models/*.js` واقعی هم همان‌جا نشسته. به همین دلیل خروجی Electron به
`build/electron/` کامپایل می‌شود (نه یک پوشهٔ موازی).

### ۳. `config/database.ts` باید `DB_PATH` را بخواند
این یک خلأ واقعی بود که در همین نشست پیدا و رفع شد: `main.ts` مسیر دیتابیس
`userData` را در `process.env.DB_PATH` می‌گذاشت، ولی `config/database.ts` قبلاً فقط
`app.tmpPath('db.sqlite3')` ثابت را می‌خواند. حالا:
```ts
filename: process.env.DB_PATH || app.tmpPath('db.sqlite3')
```

### ۴. فایل‌های `.js` باقی‌مانده در `app/models/` یک بار باعث گمراهی کامل شدند
یک اجرای ناقص tsc یک نسخهٔ stub خالی (بدون ستون/رابطه) مستقیم کنار سورس TS نوشت.
چون import نسبی (`./person.js`) آن را زودتر از سورس واقعی پیدا می‌کند، چندین
فرمان (seed، hook تست) بی‌صدا روی مدل خالی اجرا شدند. `.gitignore` حالا صریحاً
`app/**/*.js` و مسیرهای مشابه را مسدود می‌کند تا این خطا تکرار نشود.

### ۵. مسیر دیتابیس
| حالت | مسیر |
|---|---|
| dev | `tmp/db.sqlite3` همان مخزن (مثل همیشه) |
| packaged، اولین اجرا | از `resources/db-template.sqlite3` (فقط migrate شده، بدون داده) به `userData/db.sqlite3` کپی می‌شود |
| packaged، اجراهای بعدی | همان `userData/db.sqlite3` قبلی باز می‌شود |

`db-template.sqlite3` یک آرتیفکت تولیدی است (`npm run electron:gen-db-template`) و
commit نمی‌شود.

## دستورهای توسعه

```bash
# حالت dev (سه پروسس هم‌زمان: adonis build --watch، electron tsc --watch، vite)
npm run electron:dev

# بیلد کامل (backend + electron + renderer)
npm run electron:build

# type-check کامل Vue
npm run electron:typecheck

# بسته‌بندی نصبی (Windows/Mac/Linux بسته به پلتفرم اجرا)
npm run electron:pack
```

## وضعیت فعلی (برش عمودی ثابت‌شده)

فقط **افراد + گروه‌ها** به‌صورت کامل سیم‌کشی شده‌اند (CRUD واقعی، تست‌شده با یک
اجرای واقعی Electron زیر Xvfb). باقی حوزه‌ها (تراکنش‌های صندوق/شخصی/گروهی،
کارمزد، داشبورد) هنوز IPC handler و صفحهٔ Vue ندارند — الگوی `electron/ipc/people.ts`
+ `renderer/src/pages/People.vue` را برای هرکدام تکرار کنید.

## ریسک شناخته‌شده و پذیرفته‌شده
`npm audit` روی `electron-builder` و زنجیرهٔ `app-builder-lib`/`dmg-builder` آن
۲۸ آسیب‌پذیری high نشان می‌دهد. این یک مشکل شناخته‌شدهٔ اکوسیستم خودِ electron-builder
است (نه چیزی که این پروژه اضافه کرده باشد)، `electron-builder` فقط dev-dependency
است (هرگز داخل اپ نهایی نمی‌رود)، و `npm audit fix` بدون force آن را حل نمی‌کند.
پذیرفته شد؛ قبل از هر major-version bump احتمالی electron-builder دوباره چک شود.
