# Business Rules

## People و Groups
1. Person شناسه یکتا دارد.
2. عضویت Group دارای تاریخ و وضعیت است.
3. فقط اعضای فعال در تخصیص پیش‌فرض شرکت می‌کنند.
4. تغییر عضویت تاریخچه را بازنویسی نمی‌کند.

## Account
هر Person می‌تواند حساب شخصی و/یا سهم صندوق داشته باشد. نوع حساب مقصد Reinvestment را تعیین می‌کند.

## Group Transaction

### Target = Group
- اعضای فعال گروه دریافت‌کننده هستند.
- Equal allocation مبلغ را بین اعضای واجد شرایط تقسیم می‌کند.
- Effect فقط Cash است.
- Reinvestment برای Target=Group مجاز نیست.

### Target = Specific Persons
- فقط افراد انتخاب‌شده دریافت‌کننده هستند.
- Equal، Percentage و Fixed پشتیبانی می‌شود.
- Cash به مانده نقدی اثر می‌گذارد.
- Reinvestment طبق نوع حساب به Fund یا Personal اعمال می‌شود.

## Control
جمع allocationها باید دقیقاً برابر totalAmount باشد. در روش درصدی جمع درصدها باید 100% باشد.

## اصلاح
تراکنش posted حذف نمی‌شود؛ با reversal و سپس transaction اصلاحی مدیریت می‌شود.

## تاریخ
effectiveDate تاریخ اثر مالی است و createdAt زمان ثبت سیستم است.

## Precision
rounding باید مرکزی و ثابت باشد.
