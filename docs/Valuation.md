# Valuation

## هدف
محاسبه ارزش روز صندوق، سبد و حساب در تاریخ مشخص.

## اجزا
Asset Price، Quantity، Cash، Liabilities و Feeهای قابل شناسایی.

## NAV
NAV = Total Assets - Total Liabilities

در صندوق واحدی:
NAV per Unit = Net Asset Value / Outstanding Units

## Daily Valuation
هر valuation شامل valuationDate، price snapshot، holdings snapshot، cash، liabilities و netAssetValue است.

## Historical Integrity
valuation تاریخی نباید با تغییر قیمت امروز تغییر کند. داده‌های مؤثر بر گذشته باید versioned باشند.

## Profit/Loss
سود و زیان باید جریان‌های سرمایه، برداشت/واریز و ارزش‌گذاری را در نظر بگیرد.

## تست
بدون تراکنش، deposit، withdrawal، تغییر قیمت، buy/sell، fee، چند عضو و تاریخ گذشته.
