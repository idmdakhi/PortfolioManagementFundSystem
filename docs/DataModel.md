# مدل داده

منبع حقیقت: `database/migrations/*.ts`. تاریخ‌ها رشتهٔ ISO میلادی (`YYYY-MM-DD`). مبلغ = ریال صحیح (`bigInteger`). واحد = `double`.

| جدول | کاربرد | ستون‌های مهم |
| --- | --- | --- |
| `users` | ورود | `email` یکتا، `password` (هش)، `role` (`admin`/`viewer`) |
| `periods` | دوره | `label`, `start_on`, `end_on`, `status`, `months`, `begin_market`, `opening_deposits/withdrawals`, `market_value_base` و `valuation_on` (legacy)، نرخ‌ها: `fixed_rate, mgmt_rate, excess_rate, fee_cap, discount, mgmt_rate_2, excess_rate_2` |
| `investors` | سرمایه‌گذار | `name`, `opening_units`, `opening_cost` |
| `transactions` | صدور/ابطال | `investor_id` (FK)، `type`، `amount`، `nav`، `units`، `occurred_on`، `batch_id`، `kind` (`normal`/`fee`)، `created_by` |
| `personal_accounts` | حساب شخصی | یکتا روی (`investor_id`,`period_id`)؛ `begin_value, deposits, withdrawals, market_value` |
| `dividends` | سود تقسیمی | `scope`، `investor_id` (برای personal)، `amount`، `occurred_on` |
| `history_periods` | بازده سال‌های قدیمی | `label, return_pct, fee` |
| `areas` / `area_entries` | حوزه‌ها و ثبت‌ها | `kind`، `market_value`؛ ثبت: `type` (`deposit`/`withdraw`)، `batch_id` |
| `movements` | فراداده حرکت گروهی | `batch_id` یکتا، `from_ref`, `to_ref`, `method`, `total` |
| `valuations` | دفتر ارزش‌گذاری | `occurred_on`, `market_value`, `kind` (`open`/`value`/`close`) |
| `fee_receipts` | کارمزد دریافتی | `scope`, `investor_id`, `amount`, `method`, `tx_id` |
| `options` | فهرست‌ها/تنظیمات | `list`, `value`, `label`, `extra` (JSON)، `active`, `builtin` |
| `audit_logs` | حسابرسی (در پشتیبان JSON نیست) | `kind` (`request`/`change`), `user_id`, `user_email`, `method`, `path`, `action`, `entity`, `entity_id`, `before`, `after` (JSON)، `detail`, `outcome`, `ip`, `created_at` |

## کلیدهای خارجی و یکتایی
- `transactions.investor_id`, `personal_accounts.*`, `dividends.investor_id`, `area_entries.*`, `fee_receipts.investor_id` → FK.
- یکتا: `users.email`, `movements.batch_id`, `options(list,value)`, `personal_accounts(investor_id,period_id)`.
- SQLite در Lucid به‌طور پیش‌فرض FK را اجرا می‌کند؛ حذف‌ها در کد، وابستگی‌ها را پیش‌تر بررسی می‌کنند.

## ستون‌ها و جدول‌های بلااستفاده (فعلاً)
`transactions.is_deleted / edited_by / edited_at / reverses_id / edit_note`، جدول `period_snapshots`، `personal_accounts.dividends`. برای سازگاری حفظ شده‌اند؛ هیچ کد فعالی روی آن‌ها نمی‌نویسد. ← `todo.md`.

## دقت اعداد
- `units = amount / nav` به‌صورت `double` ذخیره می‌شود (مثل اکسل). خطای ممیز شناور در مقایسه‌ها با تلورانس `1e-6` (واحد) و `0.5` ریال (حوزه‌ها) مدیریت می‌شود.
- جمع هر خط مبلغ به ریال صحیح گرد می‌شود؛ کف کارمزد روی مضرب ۱۰۰٬۰۰۰ ریال است.

## داده‌های حساس
فایل دیتابیس و پشتیبان‌ها شامل نام و مبلغ افراد است. در گیت نگذارید (`.gitignore` اصلاح شد). مسیر دیتابیس با `DB_PATH` قابل تنظیم است.
