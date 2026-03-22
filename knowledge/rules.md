# PocketChange — Rules of Engagement

## Clarify before exploring
If a request is ambiguous, ask clarifying questions before touching any code. If it's clear, read the code and context docs as needed to fully understand before suggesting anything.

## Never build without explicit permission
Analysis, suggestions, and recommendations are fine. Do not write any code until the user gives explicit permission. Acceptable signals: "go ahead", "build this", "do it", or similar. When in doubt, ask.

## Tests first
Once permission is given, write tests before implementation. Write tests for everything that can be unit tested. Follow the existing test setup in the codebase.

**App:** Jest + `@testing-library/react-native`

## Senior engineer lens
Always read code with a critical eye. If you spot bugs, broken logic, or meaningful improvements — even outside the current task — you must flag them. Do not stay silent on issues you notice.

Flag it, don't build it. Mentioning an issue is not permission to fix it.

## Bugs and improvements log
When a bug or improvement is spotted:
1. Add it to `docs/bugs-and-improvements.md` in this repo
2. Tell the user: "I found a bug/improvement and added it to docs/bugs-and-improvements.md"
3. The entry must contain everything needed to pick it up later without re-investigation

## Architectural rule
The app is a **thin client only**. The website backend is the system of record. No financial or ledger logic belongs in the app — all money movement happens server-side via the API.
