# Security

## Authentication
session/token امن و secret خارج از source code.

## RBAC
SUPER_ADMIN، ADMIN، PORTFOLIO_MANAGER، ACCOUNTANT، OPERATOR، VIEWER

Permissionها بر اساس resource/action تعریف شوند.

## Separation of Duties
عملیات حساس مانند reversal، تغییر fee rule و import نهایی می‌تواند permission یا approval جدا داشته باشد.

## Audit Log
actor، action، entity، entityId، before، after، timestamp، correlationId و reason.

## Financial Security
- حذف مستقیم posted transaction ممنوع
- idempotency
- database transaction
- server-side validation
- least privilege
- backup/restore

## Privacy
اطلاعات شخصی حداقل‌سازی و دسترسی کنترل‌شده داشته باشد.
