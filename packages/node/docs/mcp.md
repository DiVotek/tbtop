# MCP

Set `mcp` and the panel answers agents at `POST {prefix}/mcp` (stateless
streamable HTTP, JSON-RPC 2.0). No SDK is involved, so it runs on Workers too.

```ts
createAdmin({
	mcp: {
		authenticate: async (request) => users.byToken(request.headers.get("authorization")),
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
`.mcp(false)`. Requests with an `Origin` outside `allowedOrigins` get 403.
