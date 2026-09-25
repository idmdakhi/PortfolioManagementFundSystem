# Fees

## مدل
FeeRule → FeeCalculation → FeeSettlement

## FeeRule
نوع، نرخ، مبنا، دوره، حداقل، سقف و شرایط اعمال.

## Calculation
محاسبه باید deterministic باشد و ورودی‌های آن برای بازسازی نتیجه ثبت شوند.

## Settlement
پس از تأیید، اثر مالی به Transaction/Ledger تبدیل می‌شود.

## Versioning
تغییر نرخ یا سقف نباید محاسبات گذشته را تغییر دهد.

## تست
نرخ صفر، نرخ معمول، سقف، چند دوره، تغییر نرخ، rounding.
