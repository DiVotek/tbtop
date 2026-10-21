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
  puts it there (`admin.session(request)`). `cookieSessions({ secret })` keeps
  it in one AES-GCM cookie (no store, runs on Workers); `memorySessions()` is a
  one-server reference store.
- **i18n**: UI locales switched through the session (`POST {prefix}/locale`),
  bundled `tbtop-admin::admin` strings (`lang/*.json`, generated from the PHP
  lang files by `bun run sync:lang`), host strings and validation templates
  per locale.
- **Uploads**: the `upload` field over a `Disk` interface (`memoryDisk`,
  `localDisk` from `/local-disk`, `r2Disk`). The type is sniffed from the
  content, SVG passes only through a host sanitizer, `sharpImages` (`/sharp`)
  converts, private files stream through signed expiring URLs, and a submit
  may only claim paths issued to its session. No media library.
- **Notifications**: `Notification` / `NotificationAction` builders, the bell's
  API under `{prefix}/api/notifications`, `memoryNotifications()` and
  `kyselyNotifications()` on Laravel's `notifications` table.
- **Endpoints** (`routes/admin.php`, minus uploads and media), as one Web `fetch`
  handler: `createAdmin().handle(request)` answers pages, endpoints and
  `POST {prefix}/logout`, and returns `null` for URLs it does not own.
- **Validation**: Laravel rules and messages; unknown rules throw. The host
  supplies `unique` / `exists` as `hostRules`.
- **Data**: the ORM is the host's. Tables and relations go through a
  `QueryDriver`; `/kysely` (driver, `kyselyRules` for `unique`/`exists`,
  notifications) and `/memory` ship.
- **Runtimes**: Bun, Node, and Cloudflare Workers (`bun run check:workers` runs
  the core in workerd; CI does too).

Not ported yet: chrome (the bell needs it to show), multi-panel, command
palette, MCP, the `admin/error` page, the media library.

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
