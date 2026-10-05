# Documentation

مرجع طراحی پروژه PortfolioManagementFundSystem.

> ⚠️ **دو لایهٔ مستندات در این پوشه وجود دارد — این را قبل از خواندن هر فایل در نظر بگیرید:**
>
> 1. **لایهٔ واقعی/فعلی** (منبع حقیقت — با کد و migration واقعی هم‌راستاست):
>    `BusinessRules.md`، `todo.md`، `SETUP.md`، مدل‌های `app/models/*` و migrationهای `database/migrations/00*`.
> 2. **لایهٔ enterprise/بلندمدت** (aspirational — مدل غنی‌تری با Account/Portfolio/Asset/Holding/Ledger/FeeRule/RBAC
>    که **هنوز هیچ‌کدام پیاده‌سازی نشده‌اند**؛ در schema واقعی جدولی به نام `ledger_entries`، `holdings`، `fee_rules`
>    یا `roles/permissions` وجود ندارد): `Architecture.md`، `DataModel.md`، `Domain.md`، `Fees.md`، `Ledger.md`،
>    `Portfolio.md`، `Security.md`، `Valuation.md`.
>
> اگر بین این دو لایه تناقض دیدید (مثلاً دربارهٔ «Cash effect» تراکنش گروهی)، **لایهٔ ۱ برنده است.**
> `Testing.md`, `Transactions.md`, `Migration.md` هر سه به‌روزرسانی شدند تا با لایهٔ ۱ هم‌خوان باشند.

- Architecture.md
- Domain.md
- BusinessRules.md
- Transactions.md
- Ledger.md
- Valuation.md
- Portfolio.md
- Fees.md
- Security.md
- DataModel.md
- Testing.md
- Migration.md
- PROJECT_CHECKLIST.md
- Electron.md (لایهٔ واقعی — فاز ۴، نتیجهٔ پیاده‌سازی و تست واقعی)

اصل کلیدی: منطق مالی در Domain/Application است؛ UI فقط ورودی و نمایش را مدیریت می‌کند.
