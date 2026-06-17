---
name: smoke
description: Use after any UI-touching wave or change, before reporting done — or on "прогони смоук", "smoke pass", "проверь страницы браузером". Project-local override for tbtop. The browser smoke suite is Pest 4 (PHP) in apps/demo/tests/Browser/, driven by Playwright. The model writes and maintains the PHP tests; composer/pest executes them — never click through pages with an agent when the suite can run instead.
---

# Smoke — tbtop browser smoke pass (Pest 4)

This project's smoke layer is **Pest 4 browser tests in PHP**, not a Playwright TS script.
It catches what happy-dom integration tests cannot: real-browser rendering (stacking, CSS,
portals), broken bundles, hydration, console errors, dead primary interactions. It stays
shallow on purpose — behavior and business rules belong to boundary Feature tests, not here.

The suite lives in `apps/demo/tests/Browser/` and is intentionally **out of CI and the
default test run** — `tests/Browser` is NOT registered as a `phpunit.xml` testsuite, so
`./vendor/bin/phpunit` (CI) and bare `vendor/bin/pest` never discover it. Reach it only via
the command below.

## Run, don't click

From `apps/demo/`:

```
composer smoke
```

That is `npm run build && vendor/bin/pest tests/Browser`. The **build is mandatory** — the
browser suite boots Laravel's own test server and renders the real React app, so it needs
`public/build/manifest.json`. Without a fresh build every page renders a blank shell and the
whole suite goes red identically — that uniform failure IS the "you forgot to build" signal.

Agent-driven page clicking is allowed ONLY inside generation/repair of the tests — never as
the recurring verification mechanism.

## How the tests are shaped

- **Auth:** `$this->actingAs($admin)` in `beforeEach` (the admin gate needs `role=admin`;
  the factory does not set it, so seed `['role' => 'admin']`). `actingAs` carries into the
  browser because the Laravel test server runs the same app instance. One dedicated test
  drives the real `/login` form to keep login-flow coverage.
- **Per page, shallow checks:** visit → `assertVisible('#app main')` (proves React hydrated
  the admin shell — a bare `main` would be read as the *text* "main", so the explicit
  `#app main` CSS selector is required) → `assertNoSmoke()` (no console logs + no JS errors).
- **Selector grammar (Pest browser plugin `guessLocator`):** `#x`/`.x`/`[..]` → CSS verbatim;
  `@testid` → `[data-testid=testid]`; a plain string → `[id="x"]` then `[name="x"]`, else a
  text match. So `type('roles', …)` targets the combobox `<input id="roles">`, while
  `@select-roles` targets its container.
- **`assertNoSmoke` is strict** — it flags ANY console log, with no allowlist. This is why we
  smoke a **production build**, not the Vite dev server: HMR logs and the React DevTools nag
  don't fire in a built bundle, so no allowlist is needed.
- **One deeper, browser-only check:** the Base UI combobox multi-select on `/admin/playground`
  (popup opens, select adds chip, non-match surfaces inline Create, create dialog stacks above
  the popup). happy-dom can't open the portalled popup, so this is browser-only.

## Maintenance — part of every UI wave's verification

After a wave that touched UI, BEFORE running:

1. Diff the wave's changed routes/pages against the dataset in `SmokePagesTest.php` — add new
   pages, drop deleted ones.
2. If a selector broke because the UI legitimately changed, fix the PHP test to match the new
   UI — never skip or comment out the check.
3. Then run `composer smoke`. A red that survives a correct test is the wave's bug, not the
   script's.

## Report

Pages passed/failed; for each failure — the page, the assertion, and the console/JS error
verbatim (Pest saves a screenshot under `tests/Browser/Screenshots/` on failure — read it to
tell "didn't render" from "rendered but errored"). Red smoke blocks "done": attribute it
(introduced vs pre-existing on the base SHA) before reacting, same as any gate.
