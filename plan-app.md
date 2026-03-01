# PocketChange — Mobile App Implementation Plan

Repository: `pocketchange-app`
Platform: React Native (Expo) / TypeScript
Audience: Donors only
API: PocketChange website backend (shared, no duplication of logic)

## Progress

| Phase | Title | Status |
|-------|-------|--------|
| 1 | Scaffold | ✅ Complete |
| 2 | Authentication | ✅ Complete |
| 3 | Donor Dashboard (Wallet) | ✅ Complete |
| 4 | QR Scanner & Short Code Lookup | ✅ Complete |
| 5 | Recipient Profile | ✅ Complete |
| 6 | Donation Flow | ✅ Complete |
| 7 | Donation History | ⬜ Pending |
| 8 | Spend Breakdown | ⬜ Pending |
| 9 | Profile & Account Management | ⬜ Pending |

---

## 1. Context & Constraints

### 1.1 What this app is
A thin-client mobile companion to the PocketChange web platform, for **donors only**. It lets donors find homeless recipients (by QR scan or 6-digit code), make donations, and track how their money was spent.

### 1.2 Hard rules
- No financial logic in the app. Server is the sole source of truth for all balances and transactions.
- No ledger logic, no balance calculations, no local state for money.
- All API calls go through service modules — never directly from screens.
- TypeScript is mandatory throughout.
- Must authenticate via the existing JWT auth system (Bearer tokens, refresh flow already implemented).
- No vendor, admin, or recipient login in this version.

### 1.3 Relationship to website
The website backend at `http://localhost:4000/api` (configurable) is the only backend. The app reuses all existing endpoints and may request new read-only or action endpoints where gaps exist, but must not ship any business logic itself.

---

## 2. Design System

### 2.1 Brand colours (from website `tailwind.config.ts`)

| Token              | Hex       | Usage                          |
|--------------------|-----------|-------------------------------|
| `brand-teal`       | `#1B5E72` | Primary text, headers, buttons |
| `brand-teal-dark`  | `#164d5e` | Button hover, pressed state    |
| `brand-teal-light` | `#2a7a92` | Secondary accents              |
| `brand-blue`       | `#7DD8E8` | Icon fill, light accents       |
| `brand-vivid`      | `#1BAFE8` | Links, highlight               |
| `brand-bg`         | `#F3F3F3` | Screen background               |
| White              | `#FFFFFF` | Cards                          |

### 2.2 Typography
- Font: **Poppins** (Google Fonts)
- Headings: bold, uppercase, `letterSpacing: 0.08em`
- Body: regular weight, `brand-teal`

### 2.3 Spacing & radius
- Card radius: `12px`
- Button radius: `8px`
- Input radius: `8px`
- Card shadow: `0 4px 24px rgba(0,0,0,0.10)`

### 2.4 App icon
- Source: `assets/images/app-icon.png` (in website repo)
- Dark teal (`#1B5E72`) square with rounded corners
- Light blue (`#7DD8E8`) dashed pocket/shield shape with stylised "P" coin
- Splash screen: same icon centred on `#F3F3F3` background

### 2.5 Centralised theme file
All tokens live in `/src/theme/index.ts`:

```ts
export const colors = {
  teal:       '#1B5E72',
  tealDark:   '#164d5e',
  tealLight:  '#2a7a92',
  blue:       '#7DD8E8',
  vivid:      '#1BAFE8',
  bg:         '#F3F3F3',
  white:      '#FFFFFF',
  error:      '#DC2626',
  success:    '#16A34A',
  textMuted:  '#9CA3AF',
};

export const radius = { card: 12, btn: 8, input: 8 };
export const shadow = { card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4 } };
export const font = { family: 'Poppins', heading: { fontWeight: '700', letterSpacing: 0.08, textTransform: 'uppercase' } };
```

---

## 3. Architecture

### 3.1 Layer diagram

```
Screen components  (src/screens / src/app)
        ↓
Custom hooks       (src/hooks)
        ↓
Service modules    (src/services)
        ↓
api.ts             (axios instance + auth interceptors)
        ↓
Remote PocketChange API  (https://api.pocketchange.org.uk/api)
```

No `fetch` or `axios` calls inside components or hooks directly — only through service modules.

### 3.2 Auth flow (existing backend)
- `POST /auth/login` → `{ accessToken, refreshToken, user }`
- `POST /auth/register` → same shape
- `POST /auth/refresh` → `{ accessToken }`
- `POST /auth/logout`
- Tokens stored in **Expo SecureStore** (never AsyncStorage for sensitive data)
- Interceptor auto-refreshes on 401 and retries once, then clears session and redirects to login

### 3.3 State management
- **Zustand** for auth state (mirrors website pattern)
- **TanStack Query** for server data (wallet, transactions, recipient profiles)
- No Redux

---

## 4. Folder Structure

```
pocketchange-app/
├── assets/
│   ├── icon.png            ← from website repo (no red border version)
│   ├── splash.png
│   └── fonts/
│       └── Poppins-*.ttf
├── src/
│   ├── app/                ← Expo Router file-based routes
│   │   ├── (auth)/
│   │   │   ├── sign-in.tsx
│   │   │   └── register.tsx
│   │   ├── (donor)/
│   │   │   ├── _layout.tsx  ← bottom tab navigator
│   │   │   ├── index.tsx    ← Dashboard / wallet
│   │   │   ├── scan.tsx     ← QR scanner + short code entry
│   │   │   ├── history.tsx  ← Donation history list
│   │   │   └── profile.tsx  ← Account management
│   │   ├── recipient/
│   │   │   └── [id].tsx     ← Recipient profile + donate action
│   │   ├── donation/
│   │   │   └── [id].tsx     ← Spend breakdown for one donation
│   │   └── _layout.tsx      ← Root layout (auth gate)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Badge.tsx    ← ACTIVE / SUSPENDED status pill
│   │   │   └── Logo.tsx
│   │   ├── donor/
│   │   │   ├── WalletCard.tsx
│   │   │   ├── TopUpSheet.tsx
│   │   │   ├── DonationRow.tsx
│   │   │   └── SpendBreakdownRow.tsx
│   │   └── recipient/
│   │       └── RecipientCard.tsx
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── wallet.service.ts
│   │   ├── recipient.service.ts
│   │   ├── donation.service.ts
│   │   └── transaction.service.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useWallet.ts
│   │   ├── useRecipient.ts
│   │   ├── useDonation.ts
│   │   └── useTransactions.ts
│   ├── store/
│   │   └── auth.store.ts
│   ├── lib/
│   │   └── api.ts           ← axios instance, interceptors
│   ├── theme/
│   │   └── index.ts
│   └── types/
│       └── index.ts         ← shared types (User, HomelessRecipient, etc.)
├── app.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## 5. Screen Inventory

### 5.1 (auth) — unauthenticated stack

| Screen | Route | Description |
|---|---|---|
| Sign In | `/sign-in` | Email + password, "Forgot password" link |
| Register | `/register` | Name, email, password, confirm |

### 5.2 (donor) — bottom tab bar

| Tab | Route | Icon | Description |
|---|---|---|---|
| Home | `/` | wallet icon | Wallet balance + top-up CTA |
| Scan | `/scan` | QR icon | QR scanner + short code fallback |
| History | `/history` | clock icon | Paginated donation list |
| Profile | `/profile` | person icon | Account details + logout |

### 5.3 Push screens (no tab)

| Screen | Route | Description |
|---|---|---|
| Recipient Profile | `/recipient/[id]` | Name, status, anonymised stats, Donate button |
| Donation Detail | `/donation/[id]` | Spend breakdown: which vendors, amounts, dates |

---

## 6. Feature Phases

---

### Phase 1 — Scaffold ✅ COMPLETE

**Goal:** runnable app shell, no features.

**Delivered:**
- Expo 52 + Expo Router 4 + TypeScript project scaffolded manually
- All core dependencies installed (`package.json` + `.npmrc`)
- `app.json` configured: name, bundle IDs, icon, splash (teal bg), camera permission
- App icon copied from website repo (`assets/icon.png`)
- `babel.config.js` + `tsconfig.json` with `@/` path alias pointing to `src/`
- `metro.config.js` for Expo Metro
- `.env.example` with `EXPO_PUBLIC_API_URL`
- Theme constants: `src/theme/index.ts` (colours, spacing, radius, shadows, font tokens)
- Shared types: `src/types/index.ts`
- Shared UI components: `Button`, `Card`, `Input`, `Spinner`, `Badge`, `Logo`
- API client stub: `src/lib/api.ts`
- Root layout: Poppins font loading + SplashScreen guard + `StatusBar`
- Full Expo Router route tree with placeholder screens for all 9 phases:
  - `(auth)/sign-in`, `(auth)/register`
  - `(donor)/index`, `(donor)/scan`, `(donor)/history`, `(donor)/profile`
  - `recipient/[id]`, `donation/[id]`
- Bottom tab navigator wired up with Ionicons

---

### Phase 2 — Authentication ✅ COMPLETE

**Goal:** full login/register/session persistence.

**Delivered:**
- `src/store/auth.store.ts` — Zustand store persisted to **Expo SecureStore** via custom async storage adapter; `_hasHydrated` flag gates the auth redirect until rehydration is done
- `src/services/auth.service.ts` — `login`, `register` (DONOR role fixed), `logout`, `refresh`; JWT payload decoded with `atob` (global in RN 0.76+) to extract `sub` + `role`
- `src/lib/api.ts` — full axios instance with Bearer token injection interceptor + 401 auto-refresh-once-then-clear interceptor (mirrors website pattern)
- `src/providers/QueryProvider.tsx` — stable `QueryClient` provider wrapping the app
- `src/hooks/useAuth.ts` — `useLogin`, `useRegister`, `useLogout` TanStack Query mutations; `useLogout` uses `onSettled` so auth is always cleared even if server call fails
- `app/_layout.tsx` — wrapped with `QueryProvider`
- `app/index.tsx` — auth gate: waits for `_hasHydrated`, routes to `/(donor)/` or `/(auth)/sign-in` based on stored `accessToken`
- `app/(auth)/sign-in.tsx` — full form: email + password, blur-triggered field validation, error banner with server error message, vivid blue background matching website auth screens
- `app/(auth)/register.tsx` — full form: email + password + confirm, inline validation, success banner, auto-redirects to sign-in on success; donor role is hardcoded (app is donor-only)

**Backend endpoints used:**
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/logout`

---

### Phase 3 — Donor Dashboard (Wallet) ✅ COMPLETE

**Goal:** show wallet balance, allow top-up.

**Delivered:**
- `src/services/wallet.service.ts` — `getBalance()`, `createTopUp(pence)`, `getTransactions(page, limit)`
- `src/hooks/useWallet.ts` — `useWalletBalance`, `useTransactions`, `useCreateTopUp`, `useInvalidateWallet`
- `src/components/donor/WalletCard.tsx` — large balance display (`£X.XX`), Top Up + Scan to Donate actions, skeleton loader
- `src/components/donor/TopUpSheet.tsx` — `@gorhom/bottom-sheet` with state machine (`amount → processing → success/error`); calls `POST /users/me/wallet/topup` for Stripe `clientSecret`, then uses `initPaymentSheet` + `presentPaymentSheet` from `@stripe/stripe-react-native` for the native payment UI; invalidates wallet query on success; user-cancel returns to amount step without error
- `src/components/donor/TransactionRow.tsx` — coloured credit/debit indicator, type label, formatted date and signed amount
- `app/(donor)/index.tsx` — greeting, live wallet card, recent activity (last 3 transactions) with "See all" → history tab, pull-to-refresh on both queries
- `app/_layout.tsx` — updated with `GestureHandlerRootView`, `StripeProvider`, `BottomSheetModalProvider` (all required wrappers)
- `app.json` — Stripe plugin added with `merchantIdentifier`
- `.env.example` — `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` added

**Backend endpoints used:**
- `GET /users/me/wallet` → `{ walletBalance: number }` (pence)
- `POST /users/me/wallet/topup` `{ amount: number }` → `{ clientSecret: string }`
- `GET /users/me/transactions?page=1&limit=3`

**Note:** `@stripe/stripe-react-native` requires a custom dev build — does not run in Expo Go.

---

### Phase 4 — QR Scanner & Short Code Lookup ✅ COMPLETE

**Goal:** identify a homeless recipient by scanning their badge QR or typing their 6-digit code.

**Delivered:**
- `src/services/recipient.service.ts` — `lookupByToken(token)`, `lookupByShortCode(code)` (strips dash before sending)
- `src/components/scan/QRScanner.tsx` — `expo-camera` `CameraView` with `useCameraPermissions`; permission request UI; debounce ref prevents duplicate scans; blue corner-marker viewfinder overlay; processing spinner overlay; resets scan lock when `active` prop flips back to true
- `src/components/scan/ShortCodeInput.tsx` — single `TextInput` (hidden, number-pad) drives a styled display `Pressable` showing live `XXX-XXX` formatting; blinking cursor indicator; submit disabled until 6 digits complete; error display
- `app/(donor)/scan.tsx` — tab switcher (Scan QR / Enter Code) with pill style; state machine (`idle → identifying → error`); 404 vs generic error handling; "Try Again" resets to idle; navigates to `/recipient/:id` on success; tab switch resets error state

**Backend endpoints used:**
- `GET /recipients/lookup?token=` — existing endpoint
- `GET /recipients/by-shortcode/:code` — new endpoint (must be added to backend if not present)

---

### Phase 5 — Recipient Profile

**Goal:** display public recipient info and allow donation.

**Screen:** `/recipient/[id].tsx`

**Display:**
- Name (nickname or first + last)
- Status badge: ACTIVE (green) / SUSPENDED (amber)
- Anonymised donation stats:
  - Total raised (all donors combined)
  - Number of unique donors
  - Recent activity timeline (no donor names exposed)
- "Donate" CTA button

**Components:** `RecipientCard`, `Badge`, donation amount input

**Services:** `recipient.service.ts`
```ts
getPublicProfile(id: string): Promise<RecipientPublicProfile>
```

**`RecipientPublicProfile` type:**
```ts
interface RecipientPublicProfile {
  id: string
  displayName: string        // nickname ?? firstName
  status: 'ACTIVE' | 'SUSPENDED'
  totalRaised: number        // pence, all donors
  donorCount: number
  recentActivity: { date: string; amountPence: number }[]
}
```

**Backend endpoint:**
- `GET /recipients/:id/public-profile` — **new endpoint required** if not present
  - Must return only public-safe data
  - No PII, no donor identity

**Donation action:** amount input → `POST /recipients/scan` (or new endpoint) → navigate to success

**Deliverable:** Donor sees recipient profile and can donate.

---

### Phase 6 — Donation Flow

**Goal:** complete the act of donating from the app.

**Triggered from:** Recipient Profile screen, or directly post-scan.

**Steps:**
1. Donor enters amount (£ input, min £0.01)
2. Confirm screen showing recipient name + amount
3. `POST /recipients/scan` `{ token, amount: pence }`
4. Success screen → navigate to `/donation/[donationId]`
5. Error screen → retry / cancel

**Services:** `donation.service.ts`
```ts
donateByToken(token: string, amountPence: number): Promise<{ donationId: string }>
```

**UX rules:**
- Disable submit while pending
- All amounts in pence to the API
- Display in pounds to the user
- Never calculate or store balance locally

**Backend endpoints used:**
- `POST /recipients/scan` (existing)
- `POST /donations/scan` (existing, vendor QR path)

**Deliverable:** Donation completes end-to-end.

---

### Phase 7 — Donation History

**Goal:** list all past donations made by the donor.

**Screen:** `(donor)/history.tsx`

**Display per row:**
- Recipient name (or "Vendor donation" if vendor QR)
- Amount donated
- Date
- Chevron → navigate to `/donation/[id]`

**Services:** `transaction.service.ts`
```ts
getDonationHistory(): Promise<DonationHistoryItem[]>
```

**Backend endpoints used:**
- `GET /transactions?type=DONATION` (existing, filtered)
- May need: `GET /donations?donorId=me` — **new endpoint** if richer data needed

**Deliverable:** Donor sees their donation history.

---

### Phase 8 — Spend Breakdown

**Goal:** show the donor exactly how their specific donation was used.

**Screen:** `/donation/[id].tsx`

**Display:**
- Donation amount + date
- For each spend event:
  - Vendor name
  - Amount spent (£)
  - Date spent
  - Status: Fully spent / Partial / Unspent
- Remaining balance (if any)
- Visual progress bar: spent vs. total

**Services:** `donation.service.ts`
```ts
getSpendBreakdown(donationId: string): Promise<SpendBreakdown>
```

**`SpendBreakdown` type:**
```ts
interface SpendBreakdown {
  donationId: string
  totalPence: number
  spentPence: number
  remainingPence: number
  redemptions: {
    vendorName: string
    amountPence: number
    date: string
    partial: boolean
  }[]
}
```

**Backend endpoint:**
- `GET /donations/:id/spend-breakdown` — **new endpoint required**
  - Returns vendor redemptions attributed to this specific donation
  - Server handles ledger attribution (no app logic)

**Deliverable:** Donor can see exactly where their money went.

---

### Phase 9 — Profile & Account Management

**Goal:** view and update donor account details.

**Screen:** `(donor)/profile.tsx`

**Display:**
- Email address
- Total donated (all time, from API)
- Account created date

**Actions:**
- Logout (clears SecureStore + Zustand, redirects to sign-in)

**Services:** `auth.service.ts` (logout)

**Backend endpoints used:**
- `GET /auth/me` or `GET /users/me` (confirm which exists)

**Deliverable:** Donor can view profile and log out.

---

## 7. Required Backend Extensions

The following new API endpoints are needed if not already present. Each must be added to the website backend following its existing architecture rules.

| # | Method | Path | Purpose | Priority |
|---|--------|------|---------|----------|
| 1 | GET | `/recipients/by-shortcode/:code` | Look up recipient by 6-digit code | MVP |
| 2 | GET | `/recipients/:id/public-profile` | Safe public profile (no PII) | MVP |
| 3 | GET | `/donations/:id/spend-breakdown` | Per-donation vendor redemption list | MVP |
| 4 | GET | `/donations?donorId=me` | Donor's donation history with recipient names | v1.1 |

All new endpoints must:
- Follow the existing backend architecture
- Reuse the existing ledger/transaction system
- Return only data the caller is authorised to see
- Not expose PII across user boundaries

---

## 8. Data Types (shared with website)

```ts
// src/types/index.ts

export interface User {
  id: string
  email: string
  role: 'DONOR' | 'VENDOR' | 'ADMIN'
  walletBalance: number
  active: boolean
  createdAt: string
}

export interface HomelessRecipient {
  id: string
  firstName: string
  lastName: string
  nickname: string | null
  qrToken: string
  shortCode: string             // formatted XXX-XXX on display
  status: 'ACTIVE' | 'SUSPENDED'
  balance: number               // pence — NEVER display raw, always from API
  createdAt: string
  updatedAt: string
}

export interface RecipientPublicProfile {
  id: string
  displayName: string
  status: 'ACTIVE' | 'SUSPENDED'
  totalRaisedPence: number
  donorCount: number
  recentActivity: { date: string; amountPence: number }[]
}

export interface DonationHistoryItem {
  id: string
  amountPence: number
  createdAt: string
  recipientName: string | null
  recipientId: string | null
}

export interface SpendBreakdown {
  donationId: string
  totalPence: number
  spentPence: number
  remainingPence: number
  redemptions: SpendRedemption[]
}

export interface SpendRedemption {
  vendorName: string
  amountPence: number
  date: string
  partial: boolean
}
```

---

## 9. Security Requirements

- Access token and refresh token stored in **Expo SecureStore only** — never AsyncStorage
- No financial data persisted locally
- No PII cached to disk
- All API calls over HTTPS in production
- 401 → auto-refresh once → clear session + redirect to login
- Suspended recipient status surfaced immediately (badge + disabled donate button)
- QR tokens are opaque non-guessable server-generated strings (no client validation of format)
- Short codes: server enforces uniqueness and non-guessability; app does no collision checking

---

## 10. Dependencies

```json
{
  "expo": "~52.x",
  "expo-router": "~4.x",
  "expo-secure-store": "~14.x",
  "expo-camera": "~16.x",
  "expo-font": "~13.x",
  "@expo-google-fonts/poppins": "latest",
  "react-native": "0.76.x",
  "typescript": "~5.x",
  "axios": "~1.x",
  "zustand": "~5.x",
  "@tanstack/react-query": "~5.x",
  "@gorhom/bottom-sheet": "~5.x"
}
```

Dev dependencies:
```json
{
  "@types/react": "~18.x",
  "@types/react-native": "~0.76.x",
  "jest": "~29.x",
  "jest-expo": "~52.x",
  "@testing-library/react-native": "~12.x"
}
```

---

## 11. Testing Plan

### Unit tests (`__tests__/services/`)
- `auth.service.test.ts` — login, register, token storage
- `donation.service.test.ts` — donate, spend breakdown
- `recipient.service.test.ts` — QR lookup, short code lookup

### Integration tests (`__tests__/flows/`)
- Auth flow: register → login → auto-refresh → logout
- QR flow: scan → recipient profile → donate → success
- Short code flow: enter code → recipient profile → donate
- History flow: list → tap donation → spend breakdown

### Manual testing checklist
- [ ] QR scan works on physical device (iOS + Android)
- [ ] Short code input auto-advances and formats `XXX-XXX`
- [ ] Suspended recipient shows correct status, donate disabled
- [ ] Token refresh happens transparently mid-session
- [ ] App recovers from network offline state gracefully
- [ ] Spend breakdown shows correct partial/full/unspent states
- [ ] Accessibility: VoiceOver / TalkBack on key screens

---

## 12. Non-Goals (MVP)

- No vendor features
- No admin features
- No recipient/homeless login
- No push notifications
- No offline mode
- No Apple Pay / Google Pay (unless already server-supported)
- No in-app browser payment flow
- No biometric auth (Face ID / fingerprint) — may be added in v1.1

---

## 13. Release Phases

| Phase | Contents |
|---|---|
| MVP | Auth + wallet + QR scan + short code + recipient profile + donate + spend breakdown |
| v1.1 | Pull-to-refresh improvements, UI polish, donation history enhancements, biometric unlock |
| v1.2 | Push notifications (donation confirmed, spend notification) |

---

## 14. Commit Convention

```
chore: project setup and expo init
chore: theme, fonts, and shared UI components
feat: authentication flow
feat: donor dashboard and wallet
feat: qr scanner and short code lookup
feat: recipient public profile screen
feat: donation flow
feat: donation history
feat: spend breakdown screen
feat: donor profile and logout
test: auth service tests
test: donation flow tests
test: recipient lookup tests
```

---

## 15. Architectural Priority Rule

If any mobile decision conflicts with the website backend architecture:

**The website backend architecture wins.**

The app is a client. It has no authority over data, balances, or transactions.

---

## 16. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Ledger mismatch from local state | High if ignored | Never store or compute balances locally |
| QR token interception | Low | HTTPS + opaque tokens |
| Short code enumeration | Medium | Rate limiting on server |
| Refresh token expiry during session | Medium | Graceful redirect to login |
| Camera permission denied | Medium | Fallback short code entry always available |
| New backend endpoints delayed | Medium | Feature-flag affected screens until endpoint ships |
| App Store review rejection (payments) | Low | No in-app payment processing — server-side only |

---

## 17. Environment Configuration

```
# .env.local (gitignored)
EXPO_PUBLIC_API_URL=http://localhost:4000/api

# Production
EXPO_PUBLIC_API_URL=https://api.pocketchange.org.uk/api
```

Config read via `process.env.EXPO_PUBLIC_API_URL` — never hardcoded.

---

*End of plan.*
