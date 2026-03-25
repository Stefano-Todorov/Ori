---
name: test
description: Run Playwright e2e tests and report results. Use when verifying changes work correctly.
disable-model-invocation: true
allowed-tools: Bash(npx playwright*)
---

Run the Playwright e2e test suite and report results:

1. Run `npx playwright test` to execute all test specs
2. Report the results: total tests, passed, failed, skipped
3. If any tests failed:
   - Show the failure message and which spec file failed
   - Read the failing test to understand what it expects
   - Suggest a fix based on the error

Test specs are in `e2e/` directory. There are 5 spec files covering:
- API health checks
- Auth flows (login/signup)
- Extension API endpoints
- Extension popup UI
- Public pages (landing, privacy, terms)

To run a single spec: `npx playwright test e2e/<spec-name>.spec.ts`
