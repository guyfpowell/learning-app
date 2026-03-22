# PocketChange — Domain Model

## Purpose
PocketChange allows members of the public (donors) to donate money to homeless people (recipients), who can spend it at approved vendors (hostels, food shops, pharmacies etc).

## Roles

**DONOR** — member of the public
- Tops up wallet via Stripe, donates to recipients by QR or short code
- Can view donation history and spend breakdown (FIFO — shows which vendors received their money)

**RECIPIENT** — homeless person with an app account
- Receives donations from donors
- Spends balance at approved vendors
- Has a QR code and short code for identification
- App account is opt-in — created by a VENDOR.MANAGER on request
- Email format: `nickname@pocketchange.org.uk`
- First login requires setting a permanent password (temp PIN provided by manager)

**VENDOR** — shop, hostel, pharmacy etc (individual location or chain)
- Split into sub-roles via VendorMembership:
  - **MANAGER**: can register recipients, manage catalogue, manage team members
  - **WORKER**: can process redemptions only
- Must be approved by ADMIN before operating
- Can be part of a VendorGroup (chain) with shared catalogue

**ADMIN** — just the project owner (single person)

## QR & Short Code System
- Recipients have both a QR code (contains qrToken) and a short code
- Short code stored without dash (ABCDEF), displayed with dash (ABC-DEF)
- **Donors** use QR or short code to find a recipient and donate
- **Vendors** use QR or short code to find a recipient, check balance, and process a redemption

## Money Flow
All balances held server-side in PostgreSQL — the app is a thin client only.

```
Donor wallet → Recipient balance → Vendor balance → [future: Vendor bank account]
```

All money movements happen on the backend. The app never performs financial calculations.

## Stripe Integration
- **Sandbox only** — not live payments
- App uses **Stripe web checkout** (hosted redirect) — Expo Go cannot run native Stripe SDK
- Stripe only handles wallet top-up. All other money movement is internal DB ledger

## Key Notes
- All monetary amounts stored in **pence** (integer), never pounds — divide by 100 for display
