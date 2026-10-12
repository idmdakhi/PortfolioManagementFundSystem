# مدیریت صندوق سبدگردانی

برنامه دسکتاپ (تک‌کاربره) برای مدیریت صندوق سبدگردانی.

## تکنولوژی‌ها
Electron + Vue 3 + TypeScript · Pinia · SQLite (better-sqlite3 ≥ 12) + Drizzle ORM · Decimal.js · Vitest

## راه‌اندازی
```bash
npm install
npm run dev          # دیتابیس هنگام اجرا خودکار ساخته/مهاجرت می‌شود
npm test             # تست هسته (core) + تست دیتابیس (data)
```
> `npm run test:db` ابتدا `better-sqlite3` را برای Node معمولی rebuild می‌کند. بعد از آن برای اجرای برنامه یک‌بار `npm run postinstall` بزنید.
> Node 20، 22 و 24 پشتیبانی می‌شوند.

## معماری
```
core/       منطق خالص (بدون Electron و دیتابیس): قواعد دفتر کل، کارمزد، snapshot، اعتبارسنجی
data/       SQLite: مهاجرت‌ها (منبع اصلی اسکیما)، Repositoryها، پشتیبان، خروجی
electron/   Main + Preload + IPC نازک (اعتبارسنجی → فراخوانی data/core)
src/        رابط Vue
tests/      core/ (سریع، بدون دیتابیس) و data/ (روی SQLite درون‌حافظه‌ای)
storage/    portfolio.sqlite · backups/ · reports/   (در git نیست)
```
جزئیات: `docs/Architecture.md`

## وضعیت
- [x] دفتر کل اضافه‌شونده، تراکنش اتمی، برگشت به‌جای حذف
- [x] مبالغ عدد صحیح (ریال)، واحدها عدد صحیح (میکرو‌واحد)، موجودی واحد مشتق از دفتر کل
- [x] کارمزد با سرمایه‌ی میانگین وزنی-زمانی، snapshot و ثبت خودکار کارمزد هنگام بستن دوره
- [x] پشتیبان خودکار (اجرا/خروج/قبل از مهاجرت) + خروجی CSV/JSON
- [ ] گزارش PDF
- [ ] تاریخ شمسی
