# Getting started

## Install

Until the package is published, build it from this repo and install the tarball:

```bash
cd packages/node && bun install && bun run build && npm pack
cd /path/to/app && npm install /path/to/tbtop/packages/node/tbtop-admin-*.tgz
npm install @tbtop/inertia-admin @inertiajs/react react react-dom
```

The package is ESM only and needs Node 22+, Bun or Cloudflare Workers
(`nodejs_compat`). Entry points:

| Import | What |
|---|---|
| `@tbtop/admin` | DSL, `createAdmin`, `createPanels`, sessions, Inertia helpers, `memoryDisk`, `r2Disk` |
| `@tbtop/admin/kysely` | `kyselyDriver`, `kyselyRules`, `kyselyNotifications` (peer: `kysely`) |
| `@tbtop/admin/memory` | `memoryDriver`, `memoryQuery` for tests and prototypes |
| `@tbtop/admin/local-disk` | `localDisk(root, baseUrl)`, uploads on the filesystem (Node and Bun) |
| `@tbtop/admin/sharp` | `sharpImages(sharp)`, image conversion; the host installs `sharp` |

## Define pages and the panel

A page is a plain object. `path` is relative to the panel prefix and takes
`$param` segments. `view` runs on every request with a fresh `S`.

```ts
import { Column, createAdmin, definePage, rootView, viteTags } from "@tbtop/admin";
import { kyselyDriver } from "@tbtop/admin/kysely";

const posts = definePage({
	path: "posts",
	title: "Posts",
	nav: { group: "Content", label: "Posts", icon: "file-text" },
	view: (s) =>
		s.table("posts")
			.columns([Column.make("title").sortable().searchable()])
			.query(() => db.selectFrom("posts").selectAll()),
});

export const admin = createAdmin({
	prefix: "/admin",
	pages: [posts, login],
	driver: kyselyDriver(db),
	loginPath: "/admin/login",
	rootView: rootView({ head: viteTags({ entry: "src/admin.tsx", devServer: "http://localhost:5173" }) }),
});
```

In production pass the Vite manifest instead of `devServer`
(`viteTags({ entry, manifest })`) and set `version` to the build id, so open
tabs reload after a deploy.

## Mount the handler

`admin.handle(request)` is a Web `fetch` handler. It answers every URL under the
prefix and returns `null` for the rest.

```ts
// Bun
Bun.serve({ fetch: async (req) => (await admin.handle(req)) ?? new Response("Not found", { status: 404 }) });

// Hono
app.all("/admin/*", async (c) => (await admin.handle(c.req.raw)) ?? c.notFound());

// Cloudflare Workers
export default { fetch: async (req: Request) => (await admin.handle(req)) ?? new Response(null, { status: 404 }) };
```

On Node without a Web server, use any adapter that turns `IncomingMessage`
into a `Request` (Hono's `@hono/node-server`, for example).

## Boot the client

The client is the same React app the PHP package uses:

```tsx
import "@tbtop/inertia-admin/styles.css";
import { createInertiaApp } from "@inertiajs/react";
import { AdminErrorPage, AdminPage } from "@tbtop/inertia-admin";
import { createRoot } from "react-dom/client";

void createInertiaApp({
	resolve: (name) => (name === "admin/error" ? AdminErrorPage : AdminPage),
	setup: ({ el, App, props }) => createRoot(el!).render(<App {...props} />),
});
```

## Sign in

The host owns auth. A login page is a `public: true` page whose form puts the
user into the session; the admin reads it back from `SESSION_USER`:

```ts
const login = definePage({
	path: "login",
	title: "Sign in",
	layout: "center",
	public: true,
	view: (s) =>
		s.form("login", [
			s.text("email").required().rules("email"),
			s.password("password").required(),
			s.actionsRow([s.action("signIn").label("Sign in").submit()]),
		]).onSubmit(async (ctx) => {
			const user = await users.verify(ctx.form.email, ctx.form.password); // your check
			await (await admin.session(ctx.request)).set(SESSION_USER, user);
			return "/admin/posts";
		}),
});
```

`POST {prefix}/logout` is built in. With `cookieSessions` it clears the
browser's cookie only: a copy of the cookie taken earlier works until its
`maxAge` runs out (see [Sessions](data.md#sessions)). To read the user from your own auth
instead, pass `user: (request, session) => ...`.

A panel without `loginPath` answers guests with 401; `allowGuests: true` opens
it (local tools only).

State-changing requests from another origin are refused (403): the request's
own host and `X-Forwarded-Host` pass, and `trustedOrigins` adds more. This
guards against a browser on another site; a script outside the browser picks
any headers it likes, so it is the session, not this check, that stops it.
Endpoint bodies are read only when sent as `application/json`; file uploads go
to their own endpoint as `multipart/form-data`, and the form then submits the
stored paths as JSON.

`apps/node-demo` in this repo is a complete host on Bun with Vite.
