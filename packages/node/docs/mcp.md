# MCP

Set `mcp` and the panel answers agents at `POST {prefix}/mcp` (stateless
streamable HTTP, JSON-RPC 2.0, batches included). No SDK is involved, so it runs on Workers too.

```ts
createAdmin({
	mcp: {
		authenticate: async (request) => {
			const [scheme, token] = (request.headers.get("authorization") ?? "").split(" ");
			return scheme === "Bearer" && token ? users.byToken(token) : null;
		},
		allowedOrigins: ["https://admin.example.com"],
		report: (error) => logger.error(error),
		// path: "mcp",
	},
});
```

`authenticate` returns the user the agent acts as, or null for a 401. Tokens
are the host's. The session gate does not run for agents, but every page
`authorize`, action gate and validation rule does.

Three tools, the same as the PHP server:

- `search`: an index of pages (executable ids, table names), or one page described: its
  tables, forms, actions and their arguments, with each form's `values` on `values: true`.
- `query`: reads a table with search, filters, sort and paging, or a field's options.
- `execute`: runs an action or submits a form (`id` is `page:name`).

A page's id is its path. Hide a page with `mcp: false` on it, an action with
`.mcp(false)`. A request with an `Origin` header outside `allowedOrigins` gets
403; without `allowedOrigins` every browser origin is refused. A client that
sends no `Origin` (a desktop agent, a CLI) is not a browser page, so the check
lets it through to authentication.

## Files by URL

An agent has no browser to upload through. Give `mcp` a `fetchRemote` and
upload fields take `{"url": "https://…"}` (optionally `name`): the server
fetches the file, checks its size and type against the field, stores it
through the field's `saveUsing()` or its disk, and hands the handler the
stored path, as the upload endpoint would. A multiple upload takes a list
that mixes stored paths and `{url}` entries; a stored file can be kept or
replaced, never dropped.

```ts
mcp: {
	authenticate,
	fetchRemote: (url) => guardedFetch(url, { redirect: "error" }),
},
```

The SSRF policy is the host's: refuse private and link-local ranges, pin the
resolved address, do not follow redirects. A Worker's `fetch()` cannot pin
DNS, so the runtime ships no guard of its own; without `fetchRemote` upload
fields stay in `excludedFields`. Media fields are always excluded: the Node
runtime has no media library to import into.
