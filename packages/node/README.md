# @tbtop/admin-node (experimental)

The tbtop admin server on Bun/Node: the PHP DSL in TypeScript, the same wire
grammar (`packages/contracts`), the same React client (`packages/client`) on the
real `@inertiajs/react`. Not a published package yet.

## What exists

- **DSL**: every PHP builder and method (`src/dsl`), same names. Gated by a
  byte-equal port of `kitchen-sink.json` and a method-parity test against
  `docs/ai/api`.
- **Inertia server protocol** (`src/server/inertia`), host-agnostic: the page
  object (HTML on first load, JSON on a visit), asset version 409, partial
  reloads, 303 redirects, `Inertia::location`, flash and the errors bag through
  the session. `rootView()` + `viteTags()` stand in for Blade's `@inertia` / `@vite`.
- **Session**: `SessionStore { get, set, forget, commit? }`, the only view of the
  host's session. The default reads the user from `SESSION_USER`; a login page
  puts it there (`admin.session(request)`). `memorySessions()` is a one-server
  reference store.
- **Endpoints** (`routes/admin.php`, minus uploads and media), as one Web `fetch`
  handler: `createAdmin().handle(request)` answers pages, endpoints and
  `POST {prefix}/logout`, and returns `null` for URLs it does not own.
- **Validation**: Laravel rules and messages; unknown rules throw. The host
  supplies `unique` / `exists` as `hostRules`.
- **Data**: the ORM is the host's. Tables and relations go through a
  `QueryDriver`; `@tbtop/admin-node/kysely` and `@tbtop/admin-node/memory` ship.

Not ported yet: uploads and media, notifications, i18n, MCP, multi-panel, chrome.

```bash
bun install && bun test && bunx tsc --noEmit
```

## Host

`apps/node-demo` is the whole host: `server.ts` is `Bun.serve` around
`admin.handle`, `src/client.tsx` is the same `createInertiaApp` boot as
`apps/demo`. Any Web-standard server (Hono, Elysia, a Start server entry)
mounts the handler the same way.

```bash
cd ../client && bun install           # the demo compiles the client from source
cd ../../apps/node-demo && bun install
bun run dev                            # Vite on :5173, the server on :3000
bun run build && bun run start         # production on Bun
```

Sign in at `/admin/login` with any email: the demo's login page trusts it.
