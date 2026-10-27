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

- `search`: lists pages, or describes one page (its tables, forms, actions and their arguments).
- `query`: reads a table with search, filters, sort and paging, or a field's options.
- `execute`: runs an action or submits a form (`id` is `page:name`).

A page's id is its path. Hide a page with `mcp: false` on it, an action with
`.mcp(false)`. A request with an `Origin` header outside `allowedOrigins` gets
403; without `allowedOrigins` every browser origin is refused. A client that
sends no `Origin` (a desktop agent, a CLI) is not a browser page, so the check
lets it through to authentication.
