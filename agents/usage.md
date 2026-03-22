# Agent Usage — PocketChange

## Quick Reference

| Command | Agent | When to use |
|---|---|---|
| `/pa` | Product Analyst | Start a new requirements discussion |
| `/pa pc-XXX` | Product Analyst | Continue or update an existing req doc |
| `/arch init` | Architect | First-time codebase analysis (run once per project) |
| `/arch pc-XXX` | Architect | Review a change for architectural significance |
| `/be pc-XXX` | Backend Dev | Implement backend changes |
| `/fe pc-XXX` | Frontend Dev | Implement frontend/web changes |
| `/app pc-XXX` | App Dev | Implement mobile app changes |
| `/review pc-XXX` | Code Reviewer | PR-style review after dev-complete |
| `/lead` | Technical Lead | Unsure of scope, need full-stack guidance |
| `/lead pc-XXX` | Technical Lead | Full-stack impact assessment for a specific change |

---

## Typical Workflow

### Small change (single layer)
```
/pa                  → discuss and write req doc (status: ready)
/be pc-XXX           → implement (status: dev-complete)
/review pc-XXX       → review (status: in-test)
[test manually]      → (status: test-complete)
[deploy]             → (status: deployed)
```

### Larger change (multiple layers)
```
/pa                  → discuss and write req doc (status: ready)
/arch pc-XXX         → architecture review if significant
/be pc-XXX           → backend first (status: dev-complete)
/review pc-XXX       → review backend
/fe pc-XXX           → frontend next (status: dev-complete)
/review pc-XXX       → review frontend
/app pc-XXX          → app last (status: dev-complete)
/review pc-XXX       → review app (status: in-test)
[test manually]      → (status: test-complete)
[deploy]             → (status: deployed)
```

### Not sure where to start
```
/lead                → scope the change, get agent sequence recommendation
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
