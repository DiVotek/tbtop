# @tbtop/admin (Bun/Node, experimental)

The tbtop admin server on Bun/Node: the PHP DSL in TypeScript, the same wire
grammar (`packages/contracts`), the same React client (`packages/client`) on the
real `@inertiajs/react`. Private and not on npm yet (internal test). Host guide:
[`docs/`](docs/README.md).

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
- **Endpoints** (`routes/admin.php`, minus the media library), as one Web `fetch`
  handler: `createAdmin().handle(request)` answers pages, endpoints and
  `POST {prefix}/logout` and `/locale`, and returns `null` for URLs it does not own.
- **Validation**: Laravel rules and messages; unknown rules throw. The host
  supplies `unique` / `exists` as `hostRules`.
- **Data**: the ORM is the host's. Tables and relations go through a
  `QueryDriver`; `/kysely` (driver, `kyselyRules` for `unique`/`exists`,
  notifications) and `/memory` ship.
- **Panel**: the `tbtop` shared prop as PHP sends it. Sidebar navigation from
  `page.nav` (groups, sections, nesting via `nav.parent`, gated by
  `authorize`), `navigationGroups` / `navigationItems` / `userMenuItems`,
  breadcrumbs, the shell as a `ChromeDef` in the DSL, the ⌘K palette, the
  four navigation layouts and appearance. A 404 under the prefix renders the
  `admin/error` page in the shell. `createPanels([...])` serves several panels
  from one handler.
- **MCP**: `mcp: { authenticate }` exposes the panel to agents at
  `POST {prefix}/mcp` (stateless streamable HTTP, JSON-RPC) with the PHP
  server's three tools: `search`, `query`, `execute`. The agent acts as the
  user `authenticate` returns from its token, with that user's gates and
  validation; the session gate does not run, Origin is checked. `mcp: false`
  on a page, `.mcp(false)` on an action hide them.
- **Runtimes**: Bun, Node, and Cloudflare Workers (`bun run check:workers` runs
  the core in workerd; CI does too).

The media library is out of scope.

```bash
bun install && bun test && bunx tsc --noEmit
bun run check:package   # build dist, publint, attw, install the tarball under Node
```

## Host

`apps/node-demo` is the whole host: `server.ts` is `Bun.serve` around
`admin.handle`, `src/client.tsx` is the same `createInertiaApp` boot as
`apps/demo`. Any Web-standard server (Hono, Elysia, a Start server entry)
mounts the handler the same way.

```bash
cd ../client && bun install           # the demo compiles the client from source
cd ../node && bun install             # and reads this package from source (tsconfig paths)
cd ../../apps/node-demo && bun install
bun run dev                            # Vite on :5173, the server on :3000
bun run build && bun run start         # production on Bun
```

Sign in at `/admin/login` with any email: the demo's login page trusts it.

An agent reaches a panel with `mcp` set like this (the token check is the
host's; repeat the panel's role checks there):

```ts
createAdmin({
	// ...
	mcp: {
		authenticate: async (request) => users.byToken(request.headers.get("authorization")),
		allowedOrigins: ["https://admin.example.com"],
	},
});
```
