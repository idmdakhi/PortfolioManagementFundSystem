# صندوق سبدگردانی خانوادگی — Fund Manager

Electron + AdonisJS + SQLite

## ساختار

```
fund-manager/
├── apps/
│   ├── api/          # AdonisJS 6 backend
│   └── desktop/      # Electron shell (فاز ۴)
├── packages/
│   └── shared/       # انواع و ثابت‌های مشترک
└── README.md
```

## شروع سریع (API)

```bash
cd apps/api
npm i
node ace migration:run
node ace db:seed
npm run dev
```

API روی `http://127.0.0.1:3333`

## فازها

| فاز | وضعیت |
|-----|--------|
| ۰ اسکلت + مدل + migration | ✅ همین پوشه |
| ۱ CRUD افراد/گروه‌ها | بعدی |
| ۲ موتور NAV و کارمزد | بعدی |
| ۳ داشبورد و PDF | بعدی |
| ۴ Electron | بعدی |
