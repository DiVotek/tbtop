# Differences from the PHP package

Same wire grammar, same React client, same DSL method names. What differs:

- **Pages** are objects (`definePage`) with TanStack-style paths
  (`posts/$post/edit`), not classes with routes. The MCP page id is the path.
- **Auth** is the host's: no published login or profile pages, no guard. A
  login page writes the user into the session; the profile page is a recipe
  ([Getting started](getting-started.md#profile)).
- **Data** goes through a `QueryDriver`, not Eloquent. Model binding,
  `relationship()` auto-loading and soft-delete macros are the host's code.
- **Validation** knows Laravel's built-in rules; `unique`/`exists` and anything
  database-bound are `hostRules`. An unknown rule throws. Input is trimmed
  and empty strings become null first, as Laravel's middleware does; a
  richtext document is not trimmed (`trimStrings` in [Data](data.md#validation)).
- **No media library**: the `upload` field only. Image conversion is optional
  through `sharp`.
- **Translations** are copied from the PHP lang files (`bun run sync:lang`).
- **Parity is soft**: the node package catches up with PHP releases, never
  blocks them. The DSL is held to PHP by the kitchen-sink fixture and a
  method-parity test.
