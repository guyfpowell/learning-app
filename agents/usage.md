# Agent Usage — PocketChange

## Quick Reference

| Command | Model | Agent | When to use |
|---|---|---|---|
| `/pa` | Sonnet | Product Analyst | Start a new requirements discussion |
| `/pa pc-XXX` | Sonnet | Product Analyst | Continue or update an existing req doc |
| `/arch init` | Opus | Architect | First-time codebase analysis (run once per project) |
| `/arch pc-XXX` | Opus | Architect | Review a change for architectural significance |
| `/be pc-XXX` | Sonnet | Backend Dev | Implement backend changes |
| `/fe pc-XXX` | Sonnet | Frontend Dev | Implement frontend/web changes |
| `/app pc-XXX` | Sonnet | App Dev | Implement mobile app changes |
| `/review pc-XXX` | Sonnet | Code Reviewer | PR-style review after dev-complete |
| `/lead` | Opus | Technical Lead | Unsure of scope, need full-stack guidance |
| `/lead pc-XXX` | Opus | Technical Lead | Full-stack impact assessment for a specific change |
| `/devops init` | Sonnet | DevOps Engineer | One-time infrastructure setup |
| `/devops check` | Sonnet | DevOps Engineer | Full health check of all live services |
| `/devops deploy web` | Sonnet | DevOps Engineer | Verify Render + Vercel deployed correctly |
| `/devops deploy app` | Sonnet | DevOps Engineer | Run `eas update` and verify |
| `/devops deploy all` | Sonnet | DevOps Engineer | Deploy and verify everything |
| `/devops env` | Sonnet | DevOps Engineer | Check env vars across all platforms |
| `/devops diagnose` | Sonnet | DevOps Engineer | Diagnose a production issue |
| `/devops diagnose pc-XXX` | Sonnet | DevOps Engineer | Diagnose why a specific change isn't working |
| `/run web` | Haiku | Service Launcher | Start backend + frontend locally |
| `/run app` | Haiku | Service Launcher | Start Expo dev server |
| `/run all` | Haiku | Service Launcher | Start all services |
| `/test-be pc-XXX` | Haiku | Backend Tester | Run backend tests for a change |
| `/test-fe pc-XXX` | Sonnet | Frontend Tester | Run frontend tests + browser visual check |
| `/test-app pc-XXX` | Haiku | App Tester | Run app tests + device sign-off prompt |

---

## Typical Workflow

### Small backend change
```
/pa                   → discuss and write req doc (status: ready)
/be pc-XXX            → implement (status: dev-complete)
/review pc-XXX        → PR-style review (status: in-test)
/run web              → start services
/test-be pc-XXX       → automated tests (status: test-complete if pass)
[deploy]              → (status: deployed)
```

### Full stack change
```
/pa                   → discuss and write req doc (status: ready)
/arch pc-XXX          → architecture review if significant
/be pc-XXX            → backend first (status: dev-complete)
/review pc-XXX        → review backend
/fe pc-XXX            → frontend next (status: dev-complete)
/app pc-XXX           → app last (status: dev-complete)
/review pc-XXX        → final review (status: in-test)
/run all              → start all services
/test-be pc-XXX       → backend tests
/test-fe pc-XXX       → frontend tests + browser visual
/test-app pc-XXX      → app tests + device sign-off prompt
                      → (status: test-complete when all pass)
[deploy]              → (status: deployed)
```

### Not sure where to start
```
/lead                 → scope the change, get agent sequence recommendation
```

---

## Req Doc Status Reference

| Status | Set by | Meaning |
|---|---|---|
| `draft` | PA | Being written |
| `ready` | PA | Complete, ready for dev |
| `in-progress` | Dev agent | Work underway |
| `blocked` | Any agent | Blocker hit, needs attention |
| `dev-complete` | Dev agent | Implementation done, ready for review |
| `in-test` | Review agent | Passed review, ready for testing |
| `test-complete` | Test agent | Testing passed, ready to deploy |
| `deployed` | Deploy agent | Live |

---

## Arch Review Flags (in req docs)

| Flag | Dev agent behaviour |
|---|---|
| `arch-review: not-required` | Proceed normally |
| `arch-review: recommended` | Proceed with caution, flag structural concerns |
| `arch-review: required - pending` | **Blocked** — run `/arch pc-XXX` first |
| `arch-review: required - approved` | Proceed, follow ADR constraints |
| `arch-review: required - rejected` | Blocked — req doc needs rework |

---

## Agent Files

| Agent | Website repo | App repo |
|---|---|---|
| PA | `agents/pa.md` | `agents/pa.md` |
| Arch | `agents/arch.md` | `agents/arch.md` |
| Backend | `agents/be.md` | — |
| Frontend | `agents/fe.md` | — |
| App | — | `agents/app.md` |
| Review | `agents/review.md` | `agents/review.md` |
| Lead | `agents/lead.md` | `agents/lead.md` |
| Run | `agents/run.md` | `agents/run.md` |
| Test BE | `agents/test-be.md` | — |
| Test FE | `agents/test-fe.md` | — |
| Test App | — | `agents/test-app.md` |
| DevOps | `agents/devops.md` | `agents/devops.md` |
