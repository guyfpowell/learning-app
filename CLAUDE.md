# PocketChange App — Claude Context

This is the mobile app repo (React Native + Expo).

## Knowledge Files

- [knowledge/rules.md](knowledge/rules.md) — Rules of engagement: how to approach all work, TDD, bug logging
- [knowledge/domain.md](knowledge/domain.md) — Domain model: roles, money flow, QR/shortcode system, Stripe status
- [knowledge/deployment.md](knowledge/deployment.md) — Live services, URLs, Expo Go constraints, OTA update workflow
- [knowledge/migrations.md](knowledge/migrations.md) — DB migration process (handled in website repo via Supabase SQL editor)

## Quick Reference

- **Stack:** React Native + Expo ~52 + Expo Router ~4 | Zustand (auth) + TanStack Query (server data) | Axios
- **Auth:** JWT Bearer tokens in Expo SecureStore + refresh interceptor
- **Stripe:** Hosted web checkout only — Expo Go cannot run native Stripe SDK (hard constraint)
- **OTA updates:** `eas update --branch main --message "..."` — no native builds, no build credits
- **All money in pence** — divide by 100 for display, never store or calculate pounds in the app
- **Thin client** — no financial logic in the app, all money movement is server-side
