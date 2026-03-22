# PocketChange — Deployment Infrastructure

## Services

| Service | Platform | URL |
|---|---|---|
| Backend API | Render | https://pocketchange-backend.onrender.com |
| Redis | Render | (same account as backend) |
| Frontend | Vercel | https://pocketchange-frontend.vercel.app / https://pocketchange.org.uk |
| Database | Supabase | https://jobwjzbqjnnihaoqrgzt.supabase.co |
| Mobile app | Expo Go + EAS | project: pocketchange-app (user: guyfpowell) |

**Security: these URLs are sensitive — never put them in code, logs, or any committed file. Always use env var references instead.**

## Environment Variables
Manually set in each platform's dashboard. No `.env` files committed to the repo.

## Mobile App — Critical Constraints
- Runs inside **Expo Go** on iOS — not a standalone app, no Apple Developer account
- No native builds (EAS Build not used — free account, no build credits)
- Updates pushed via **`eas update`** — OTA JS bundle, no build credits used
- **No native libraries** that aren't bundled with Expo Go
- **Stripe**: Expo Go cannot run native Stripe SDK — must use **Stripe web checkout** (hosted redirect). Hard constraint, not a choice.

## App OTA Update Command
```bash
eas update --branch main --message "description of change"
```

## Repos
- Website (backend + frontend): https://github.com/guyfpowell/pocketchange
- App: https://github.com/guyfpowell/pocketchange-app

## Future Slash Commands (not yet built)
- `/deploy-web` — commit, push, deploy frontend
- `/deploy-app` — push OTA update via `eas update`
