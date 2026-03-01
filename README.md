# PocketChange App

Mobile companion app for the [PocketChange](https://pocketchange.org.uk) platform.

**Donors only.** Thin client — all financial logic lives on the server.

---

## What it does

PocketChange lets donors give directly to people experiencing homelessness. Recipients carry a badge with a QR code; donors scan it with this app, choose an amount, and donate from their pre-loaded wallet. Donors can then track exactly how their money was spent — which vendors redeemed it and when.

---

## Tech stack

| | |
|---|---|
| Framework | React Native + Expo 52 |
| Routing | Expo Router 4 |
| Language | TypeScript (strict) |
| State | Zustand (auth) + TanStack Query (server data) |
| HTTP | Axios with Bearer token + auto-refresh interceptors |
| Secure storage | Expo SecureStore |
| Font | Poppins |

---

## Getting started

### Prerequisites

- Node 20+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode + Simulator, or Expo Go on a physical device
- Android: Android Studio + Emulator, or Expo Go on a physical device

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env.local` and set the API URL:

```bash
cp .env.example .env.local
```

```
EXPO_PUBLIC_API_URL=http://localhost:4000/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

> **Note:** This app uses `@stripe/stripe-react-native` and `expo-camera`, which require native modules. It will **not** run in Expo Go — you need a [custom development build](https://docs.expo.dev/develop/development-builds/introduction/).

### Run

```bash
# Start Metro bundler (scan QR with Expo Go)
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android
```

---

## Project structure

```
app/                  ← Expo Router file-based routes
  (auth)/             ← Unauthenticated screens (sign-in, register)
  (donor)/            ← Tab navigator (dashboard, scan, history, profile)
  recipient/[id].tsx  ← Recipient public profile + donate
  donation/[id].tsx   ← Spend breakdown for a single donation

src/
  components/ui/      ← Shared UI: Button, Card, Input, Spinner, Badge, Logo
  components/donor/   ← Donor-specific components (Phase 3+)
  components/recipient/ ← Recipient-specific components (Phase 5+)
  services/           ← API service modules (one per domain)
  hooks/              ← TanStack Query hooks
  store/              ← Zustand auth store
  lib/api.ts          ← Axios instance + auth interceptors
  theme/index.ts      ← Brand colours, spacing, typography tokens
  types/index.ts      ← Shared TypeScript types

assets/
  icon.png            ← App icon (used for iOS, Android adaptive, splash)
```

---

## Architecture rules

- **No financial logic in the app.** Server is the sole source of truth.
- **No balance calculations.** All amounts come from API responses.
- **No direct API calls in components.** Everything goes through `src/services/`.
- **Tokens stored in Expo SecureStore only** — never AsyncStorage.
- If any mobile decision conflicts with the website backend architecture, **the website wins**.

---

## Build phases

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Scaffold — Expo setup, theme, shared UI | ✅ Complete |
| 2 | Authentication — login, register, session | ✅ Complete |
| 3 | Donor Dashboard — wallet balance, top-up | ✅ Complete |
| 4 | QR Scanner & short code lookup | ✅ Complete |
| 5 | Recipient public profile | ✅ Complete |
| 6 | Donation flow | ✅ Complete |
| 7 | Donation history | ⬜ Next |
| 8 | Spend breakdown | ⬜ |
| 9 | Profile & account management | ⬜ |

See [plan-app.md](./plan-app.md) for the full implementation plan.

---

## Contributing

Follow the commit convention:

```
chore: project setup
feat: authentication flow
feat: qr scanning
feat: recipient profile
feat: donation flow
feat: spend breakdown view
test: auth tests
```
