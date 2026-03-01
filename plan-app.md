# PocketChange — Mobile App Implementation Plan

Repository: `pocketchange-app`
Platform: React Native (Expo) / TypeScript
Audience: Donors only
API: PocketChange website backend (shared, no duplication of logic)

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

### Phase 1 — Scaffold

**Goal:** runnable app shell, no features.

- Init Expo with TypeScript template: `npx create-expo-app pocketchange-app --template blank-typescript`
- Install core dependencies (see §10)
- Configure Expo Router
- Set up `app.json` (name, bundle ID, icon, splash)
- Copy app icon from website repo (remove red border / use clean version)
- Implement theme constants
- Implement shared UI primitives: `Button`, `Card`, `Input`, `Spinner`
- Configure environment: `EXPO_PUBLIC_API_URL`
- Load Poppins font via `expo-font` or `@expo-google-fonts/poppins`

**Deliverable:** App launches, shows placeholder screen with logo.

---

### Phase 2 — Authentication

**Goal:** full login/register/session persistence.

**Screens:** `sign-in.tsx`, `register.tsx`

**Services:** `auth.service.ts`
```ts
login(email, password): Promise<AuthResponse>
register(name, email, password): Promise<AuthResponse>
logout(): Promise<void>
refresh(refreshToken): Promise<{ accessToken }>
```

**Store:** `auth.store.ts` (Zustand)
```ts
{ user, accessToken, refreshToken, setAuth, clearAuth }
```

**Token storage:** `expo-secure-store`
```ts
await SecureStore.setItemAsync('accessToken', token)
await SecureStore.setItemAsync('refreshToken', token)
```

**Root layout gate:** reads stored tokens on app launch → auto-login or redirect to sign-in.

**API interceptors** (same pattern as website `api.ts`):
- Inject `Authorization: Bearer <token>` on every request
- On 401: call refresh once, retry, then clear auth + redirect

**Backend endpoints used:**
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/logout`

**Deliverable:** Full auth flow working.

---

### Phase 3 — Donor Dashboard (Wallet)

**Goal:** show wallet balance, allow top-up.

**Screen:** `(donor)/index.tsx`

**Components:** `WalletCard`, `TopUpSheet` (bottom sheet)

**Services:** `wallet.service.ts`
```ts
getBalance(): Promise<{ walletBalance: number }>
topUp(amountPence: number): Promise<void>
```

**Hooks:** `useWallet.ts` (TanStack Query, key `['wallet']`)

**Backend endpoints used:**
- `GET /wallet/balance` (or equivalent — confirm with website)
- `POST /wallet/topup`

**UX notes:**
- Balance displayed in pounds: `£${(pence / 100).toFixed(2)}`
- Top-up via bottom sheet modal (not full screen)
- Pull-to-refresh

**Deliverable:** Donor can see balance and top up.

---

### Phase 4 — QR Scanner & Short Code Lookup

**Goal:** identify a homeless recipient by scanning their badge QR or typing their 6-digit code.

**Screen:** `(donor)/scan.tsx`

Two-tab layout:
1. **Scan** — live camera QR scanner
2. **Enter Code** — short code text input formatted as `XXX-XXX`

**Flow:**
```
Scan QR / Enter code
      ↓
GET /recipients/lookup?token=<qrToken>
  OR
GET /recipients/by-shortcode/<code>
      ↓
Navigate to /recipient/[id]
```

**Components:**
- `expo-camera` / `expo-barcode-scanner` for QR
- Custom `ShortCodeInput` component (3+3 digit groups, auto-advance)

**Services:** `recipient.service.ts`
```ts
lookupByToken(token: string): Promise<RecipientPublicProfile>
lookupByShortCode(code: string): Promise<RecipientPublicProfile>
```

**Backend endpoints used:**
- `GET /recipients/lookup?token=` — already exists (from website scan page)
- `GET /recipients/by-shortcode/:code` — confirm if exists, otherwise request addition

**Deliverable:** Donor can find a recipient by either method.

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
