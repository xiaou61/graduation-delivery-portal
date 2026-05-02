# MySQL Setup

This project now uses MySQL for persistent storage.

## 1. Create Database

```sql
create database graduation_delivery
  default character set utf8mb4
  default collate utf8mb4_unicode_ci;
```

If your MySQL user has `CREATE DATABASE` permission, the app can create this database automatically on first start.

## 2. Configure Environment

Create `.env.local` in the project root. `MYSQL_URL` is recommended because some machines have a global `DATABASE_URL` from other projects:

```env
MYSQL_URL=mysql://root:password@localhost:3306/graduation_delivery
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-admin-password
SESSION_SECRET=replace-with-a-long-random-secret
```

You can also use `DATABASE_URL`, but it must start with `mysql://` or `mysql2://`.

## 3. Start App

```bash
npm run dev
```

The app creates tables automatically on first database connection and inserts demo data if the database is empty.
