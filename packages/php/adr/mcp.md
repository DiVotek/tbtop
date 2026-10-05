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
  `[SetCurrentPanel, ValidateMcpOrigin, ...PanelConfig::mcp($middleware), SetAdminLocale]` — not the panel's
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
- **Origin is validated by the package, not left to the host.** The streamable HTTP
  transport requires it and laravel/mcp does not do it. No `Origin` passes (non-browser
  clients); the app's own origin and `mcpAllowedOrigins()` pass; anything else is 403.
- **Actions and `onSubmit` forms are one executable kind to the agent.** Ids are
  `{page-slug}:{name}`; route params travel separately as `params`.
- **Two-level discovery.** `search()` lists pages and the actions/forms of parameterless
  pages. `search(page, params)` builds that record's tree and lists its actions/forms. The
  tree is built per call with no cache — gates are per-user.
- **Arguments are described, not schematised.** Per field: kind, label, options and the
  Laravel rules (strings; a rule object such as richtext's `EmbedsRule` is passed through
  as `collectRules()` yields it). The server validates
  and returns errors as text; a generated JSON Schema would add a lossy mapping layer the
  agent does not need.
- **`query` returns UI-shaped rows** via `ColumnProjection` (visible columns, formatting,
  record key) with the table's pagination, filters and search. A row action receives that
  row back as `$ctx->row`, exactly as from the browser.
- **Visibility: everything the user can do, minus `->mcp(false)`.** Opt-out on an action
  or a page, server-only — never serialized to the wire. Client-only `custom` handlers
  and `upload`/`media`/`richtext` fields are excluded from `search` with a stated reason.
- **A form is unfillable when every field is excluded or a required one is.** Required is
  checked per rule key (`name` or `name.*`): the string `required` without `sometimes` on
  that same key — a multiple upload has `required` on `name` and `sometimes` on `name.*`,
  and still fails without a file. It applies only where the form is validated (`onSubmit`,
  an action without `->withoutValidation()`). `search()` never advertises an executable
  that cannot pass validation; a demo-only fix was rejected. Excluded kinds nested in a
  container (an upload in a repeater) are not walked yet.
- **`needs` is enforced in `ExecuteTool`, not `ActionController`.** A missing `row`,
  `selection` (empty, or holding anything but keys, counts as missing) or `form`, or a row
  without its `id` (the key the client reads), is refused before the handler runs —
  otherwise `whereKey(null)` reports success. A key is an int or a non-empty string: an
  array `id` would make `whereKey()` a `whereIn` on other rows. The browser always sends what the UI wired; enforcing it in the
  controller would change the HTTP contract for every client.
- **`query` refuses what `search()` does not list.** sort (plus the default-sort field,
  which `search()` lists in `sortable`), perPage, filter names, `columnSearch` columns and
  table-wide search are checked against the same description `search()` produces, after
  the page gate; `dir` must be `asc`/`desc` and search text a string or number, which
  `TableQuery` would otherwise cast or ignore. Checking inside `TableController` was rejected: it would change browser
  behavior for stale URL state. Only arguments that distort the result are refused.
- **Unexpected failures answer generically.** `AnswersAgent` maps validation, authorization,
  authentication, not-found, HTTP 4xx and `AgentError`; anything else and HTTP >= 500 are
  reported and answered `Server error; see the application log.` — laravel/mcp would echo
  the message (SQL, paths) when `app.debug` is on. HTTP exceptions are reported through a
  wrapper, as Laravel never reports them itself.
- **Row and selection stay client input; the threat model is documented, not enforced.**
  `execute` passes `row`/`selection` to the handler as the browser path does. Re-loading
  them would need the table's query scope inside the action, which the package does not
  know for author-written handlers. `docs/ai/wiring.md` → Threat model tells authors to
  re-load and authorize by key, and clients to confirm `execute`.
- **Read and write ship together.** A read-only first phase exists to limit an untrusted
  agent; this one is trusted.

## Why

Every page is already a machine-readable contract with server-side gates and validation.
Invoking the same controllers keeps one truth for page gates and validation: MCP cannot
drift from the UI there. The deliberate gap is middleware — it belongs to the transport,
and the host owns the MCP transport's stack.
