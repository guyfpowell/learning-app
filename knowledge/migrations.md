# PocketChange — Database Migrations

## Rule
All schema changes must be written as raw SQL and run in the **Supabase web dashboard SQL editor**.

Never use `prisma migrate`, seed scripts, or any programmatic migration runner.

## Why
Seed scripts and ORM migrations consistently fail in this project. The Supabase SQL editor directly targets the production database and is reliable.

## Process (handled in the website repo)
1. Write the SQL migration
2. Save it to `docs/migrations/NNN_description.sql` in the website repo
3. Run it in the Supabase dashboard
4. Run `npx prisma generate` in `backend/` to regenerate the Prisma client

## Notes on Enum Changes
`ALTER TYPE ... ADD VALUE` must run outside a transaction block — run it as a separate statement before any dependent `ALTER TABLE` statements.
