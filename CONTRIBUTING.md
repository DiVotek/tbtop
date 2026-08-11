# Contributing

Thanks for considering a contribution to Tabletop. This is a monorepo shipping
two packages in lockstep — please read this before opening a PR.

## Layout

- `packages/php` — composer `tbtop/admin`: the PHP DSL, controllers, media,
  auth glue.
- `packages/client` — npm `@tbtop/inertia-admin`: the React interpreter that
  renders the DSL's JSON output.
- `packages/contracts` — the generated JSON Schema grammar and the
  `kitchen-sink.json` fixture shared by both sides.
- `apps/demo` — a Laravel + Inertia reference app that wires both packages
  together. `apps/demo/app/Admin/Pages/` is the best place to see real DSL
  usage.

See the root `CLAUDE.md` for the full architecture rundown and the "where
does code go" table — it's the fastest way to figure out which package a
change belongs in.

## Running the test suites

PHP package:

```bash
cd packages/php
vendor/bin/pest
vendor/bin/phpstan analyse
vendor/bin/pint --test
```

Client package:

```bash
cd packages/client
bun test
bunx tsc --noEmit
```

Demo app (Laravel feature/browser tests for walking-skeleton flows):

```bash
cd apps/demo
php artisan test
```

Run only the tests for what you changed locally; CI runs the full suite.

## The contract is a hard gate

The PHP DSL, the JSON Schema, and the React grammar describe **one** wire
vocabulary, and they will drift silently if a change only touches one side.

**A new field kind or block kind requires all of the following in the SAME
change:** a PHP builder (`packages/php/src/Dsl/Fields/` or the relevant DSL
class), a React component (`packages/client/src/fields/` or the block
registry), a JSON Schema entry, and a passing contract test. Never split this
across separate PRs — a PHP-only or client-only change to the wire shape is
the most common way to break the other side.

After any DSL change, run the PHP contract tests:

```bash
cd packages/php && vendor/bin/pest --filter Contract
```

If the kitchen-sink fixture changed intentionally, regenerate it and review
the diff — an unexpected diff means the wire shape broke:

```bash
UPDATE_FIXTURES=1 vendor/bin/pest --filter Contract
```

## Commit convention

Commit subjects follow `type(scope): subject` (e.g.
`fix(uploads): close the svg and text/html gap`). Keep the scope to the
domain the change is about, not just the directory.

## Language

This repo is open source. README, docs, code comments, commit messages, and
any other consumer-facing text are written in English. Non-Latin strings that
appear in tests, seeders, or locale fixtures (e.g. Ukrainian translatable
data) are deliberate i18n test fixtures — leave them as-is.

## Opening a PR

- Keep changes scoped to what the PR describes.
- If your change touches the wire contract, include the schema + client +
  PHP contract test together (see above) — PRs that split them will be asked
  to combine.
- Describe what changed and why in the PR body; link any relevant issue.
