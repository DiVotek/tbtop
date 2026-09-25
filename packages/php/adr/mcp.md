---
domain: mcp
---

# MCP server (agent access to a panel)

## Decisions

- **Trusted agent, user's rights.** The client is a human-controlled agent (Claude Desktop,
  OpenAI, …) acting under the user's token. The package applies no MCP-specific
  restrictions: the agent can do exactly what the user can do in the UI. Destructive-call
  confirmation is the MCP client's job, driven by tool annotations.
- **Lives in core, opt-in.** `laravel/mcp` is a `suggest` dependency of `tbtop/admin`;
  a panel enables it with `PanelConfig::mcp()`. A separate package was rejected: it would
  freeze `ResolvedPage`, the page registry and the action resolvers as public API for one
  consumer.
- **Auth is the host's; the MCP stack replaces the panel's.** The MCP route runs
  `[SetCurrentPanel, ...PanelConfig::mcp($middleware), SetAdminLocale]` — not the panel's
  `web` + session-guard stack, which rejects bearer tokens (401) and non-browser POSTs
  (419). The host picks stateless token auth (e.g. `auth:sanctum`) and issues tokens.
- **The MCP stack is explicit, never inherited.** `mcp($middleware)` has no default and
  rejects an empty list: the host writes the whole stack, role checks included
  (`['auth:sanctum', 'abilities:tbtop-mcp', 'role:admin']`). A page's own restriction
  belongs in `Page::can()`, which MCP enforces; `Page::middleware()` is transport only.
  Inheriting the panel's middleware minus "transport" (`web`, `auth:*`) was rejected: it
  fails closed, but the package cannot tell transport from access (a custom group, a
  session-bound 2FA check), so the heuristic breaks on the first non-standard host. A
  default of `['auth:sanctum']` was rejected: `->mcp()` read as "configured" while it
  checked no role.
- **Three tools: `search`, `query`, `execute`.** `query` is read-only by construction
  (package code), annotated `readOnlyHint`. `execute` is always `destructiveHint`: actions
  are author-written, so the package cannot tell a delete from an edit and does not try.
  One tool per action was rejected — it floods the agent's context on real panels.
- **Execution invokes the existing controllers in-process, without the panel's
  middleware.** `execute`/`query` build a `Request` matched and bound to the page's
  action/form/table route, with the MCP user on its user resolver, and call
  `ActionController`/`FormSubmitController`/`TableController` directly. Page gates,
  `reachable*` authorization and validation run inside those controllers, so they hold;
  `$ctx->request` is a real, route-bound request. Panel and page middleware do not run.
  A kernel sub-request was rejected (verified): through `web` it needs the package to
  bypass CSRF and inject the panel guard's user, and session-bound host middleware (e.g.
  2FA gates) still fails with a fresh session. Validation failures surface as
  `ValidationException` → error text; a form redirect is the handler's own outcome (no
  middleware can bounce) and is reported as a `redirect` URL; form effects come from the
  `tbtop.effects` flash.
  > Replaces previous decision (see git history)
- **Actions and `onSubmit` forms are one executable kind to the agent.** Ids are
  `{page-slug}:{name}`; route params travel separately as `params`.
- **Two-level discovery.** `search()` lists pages and the actions/forms of parameterless
  pages. `search(page, params)` builds that record's tree and lists its actions/forms. The
  tree is built per call with no cache — gates are per-user.
- **Arguments are described, not schematised.** Per field: kind, label, options and the
  Laravel rules as strings (`collectRules()` yields strings only). The server validates
  and returns errors as text; a generated JSON Schema would add a lossy mapping layer the
  agent does not need.
- **`query` returns UI-shaped rows** via `ColumnProjection` (visible columns, formatting,
  record key) with the table's pagination, filters and search. A row action receives that
  row back as `$ctx->row`, exactly as from the browser.
- **Visibility: everything the user can do, minus `->mcp(false)`.** Opt-out on an action
  or a page, server-only — never serialized to the wire. Client-only `custom` handlers
  and `upload`/`media`/`richtext` fields are excluded from `search` with a stated reason.
- **Read and write ship together.** A read-only first phase exists to limit an untrusted
  agent; this one is trusted.

## Why

Every page is already a machine-readable contract with server-side gates and validation.
Invoking the same controllers keeps one truth for page gates and validation: MCP cannot
drift from the UI there. The deliberate gap is middleware — it belongs to the transport,
and the host owns the MCP transport's stack.
