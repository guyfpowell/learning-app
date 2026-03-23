# pc-006 — Recipient App Logout

**Status:** `test-complete`

## Summary

Add a logout button to the recipient mobile app home screen. Tapping it immediately logs the user out: invalidates the session server-side, clears all local tokens, and returns the user to the login screen.

## Business Context

Recipients currently have no way to log out of the app. This is a basic security requirement — if a recipient hands their phone to someone else or loses it, there is no way to end the session. A logout button also closes the loop on a proper auth lifecycle.

## Scope

**In scope:**
- Logout button on the home screen, positioned below the History button
- Call `POST /auth/logout` to invalidate the refresh token server-side
- Clear access token and refresh token from SecureStore
- Navigate to the login screen

**Out of scope:**
- Confirmation dialog (immediate logout on tap)
- Any backend changes (endpoint already exists)
- PIN reset or account management

## Requirements

1. A "Log out" button is visible on the home screen below the History button.
2. Tapping the button immediately (no confirmation prompt) initiates the logout flow.
3. The app calls `POST /auth/logout` with the current Bearer token before clearing local state.
4. Both the access token and refresh token are removed from SecureStore.
5. After logout, the user is navigated to the login screen and cannot navigate back without re-authenticating.
6. If the backend call fails (e.g. network unavailable), the app still clears local tokens and navigates to login — logout must always succeed locally.

## Acceptance Criteria

- [ ] Logout button is visible on the home screen, below History
- [ ] Tapping it calls `POST /auth/logout` with the Bearer token
- [ ] Access token and refresh token are cleared from SecureStore after the call
- [ ] User is taken to the login screen
- [ ] Back navigation after logout is blocked (user must log in again)
- [ ] If `POST /auth/logout` returns an error or times out, the app still clears tokens and redirects to login

## Regression Scope

- **Auth flow** — login, token storage in SecureStore, initial auth check on app load
- **Axios interceptor** — refresh token logic must not attempt a refresh after logout (tokens will be gone)
- **Home screen layout** — button ordering and spacing around History and the new logout button
- **Navigation stack** — post-logout navigation should not allow back-swipe into authenticated screens

## Open Questions

None.
