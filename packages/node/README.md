# @tbtop/admin-node (experimental)

The tbtop admin server on Bun/Node: same PHP DSL shape in TypeScript, same wire
grammar (`packages/contracts`), same React client (`packages/client`). This is a
proof of the idea, not a published package.

## What exists

- DSL subset: `stack`, `row`, `section`, display text, fields `text`, `textarea`,
  `slug`, `number`, `boolean`, `select`, `form`, `action`, `table`, `column`.
- Typed forms: `onSubmit` receives the payload inferred from the fields
  (`required()` narrows `string | null` to `string`, `options()` to a literal union).
- Endpoints `forms`, `actions` and `tables` as one Web `fetch` handler
  (`createAdmin().handle`), plus `pageProps()` for a page loader.
- Validation: zod schemas built from field constraints, 422 in Laravel's
  `{message, errors}` shape, only declared keys reach handlers.
- Tables: hosts pass a row source; `@tbtop/admin-node/kysely` provides one over Kysely.

Not ported yet: the other 20 field kinds, filters, tabs, relation, uploads, live
regions, media, notifications, i18n, MCP, multi-panel.

## Parity gate

`test/contract.test.ts` validates every page against `structure.schema.json` and
compares forms authored in TS with the PHP `kitchen-sink.json`. A wire change on
the PHP side breaks this test in the same PR.

```bash
bun install && bun test && bunx tsc --noEmit
```

## Host: TanStack Start

`apps/start-demo` renders the unchanged client in TanStack Start. `src/server.ts`
mounts `admin.handle` before Start's handler; `routes/admin.$.tsx` loads
`pageProps()`; `src/admin/inertia-shim.tsx` aliases `@inertiajs/react` onto
TanStack Router (`usePage`, `router`, `Link`, `Head`).

```bash
cd ../client && bun install       # the demo compiles the client from source
cd ../../apps/start-demo && bun install
bunx vite dev                     # http://localhost:3000/admin/posts
bunx vite build && bun serve.ts   # production on Bun
```
