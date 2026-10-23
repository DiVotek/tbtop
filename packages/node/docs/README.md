# @tbtop/admin for Bun and Node

Host guide for the TypeScript server of tbtop admin. The package is private
and not on npm yet: it is under internal test. These pages will move to the
docs site once it ships.

- [Getting started](getting-started.md): install, mount the handler, boot the client, sign in.
- [Data, auth and uploads](data.md): the query driver, sessions, host rules, disks, notifications.
- [The panel](panel.md): navigation, chrome, palette, appearance, locales, several panels.
- [MCP](mcp.md): exposing a panel to AI agents.
- [Porting a PHP page](porting.md): typed tables, host rules, uploads, records.
- [Differences from the PHP package](differences.md).

The DSL itself (`S`, fields, tables, actions, effects) is the PHP one with the
same method names: its reference is [`docs/ai`](../../../docs/ai) at the
repo root. Read `->method()` as `.method()`.
