# اجرای سریع

```
npm install
cp .env.example .env            # ویندوز: copy
node ace generate:key
node ace codegen
node ace migration:run
node ace db:seed
npm run dev                     # http://localhost:3333  (admin@example.com / ChangeMe-123)
```

ارتقا روی داده موجود:
```
node ace codegen
node ace migration:run
npm run dev
```

تست:
```
node ace test           # unit + integration (دیتابیس جدا: tmp/test.sqlite3)
npx tsc --noEmit
```
جزئیات: `Operations.md`، `Testing.md`.
