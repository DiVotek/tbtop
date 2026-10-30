# Porting a PHP page

Most of a page carries over line by line: `$s->text('title')->required()`
becomes `s.text("title").required()`. The parts that do not:

## Tables

- Give the table its query first. `.query(() => memoryQuery(...))` (or a Kysely
  select) types the rest of the chain, so tab scopes and filters see the
  driver's query, not `unknown`:

  ```ts
  s.table("posts")
  	.query(() => db.selectFrom("posts").selectAll())
  	.columns({ title: "Title", status: "Status" }) // text columns, label by name
  	.tabs((tab) => [
  		tab("all").count(),
  		tab("live").query((q) => q.where("status", "=", "live")),
  	]);
  ```

  `Tab.make<Q>()` still works when the tabs come before `query()`.
- `filterUsing` takes the query type you name: `.filterUsing((q: Query, value: string) => q.where(...))`.
- `relationship()` does not load anything. Join or select the related column
  in the query and point the column at it.

## Validation

`unique` and `exists` are host rules. With Kysely, `kyselyRules(db)` gives both;
otherwise write `{ message, check(value, args) }` in `hostRules`. A rule the
package does not know throws at submit, so a missing one shows up on the first
save, not in production.

## Uploads

An `upload` field needs a disk (`disks.public` by default), `secret` for private
files, and `sharp` passed as `images` when a field uses `convertTo()`. The host
serves `/storage/...` itself. See [Data, auth and uploads](data.md#uploads).

## Records

`record()` and a modal's `query()` may hand back database values as they come:
date fields get cut to `Y-m-d` on the server, in page props and in
`actions/{name}/data`, so `"2024-03-15 23:30:00"` from MySQL is fine.
