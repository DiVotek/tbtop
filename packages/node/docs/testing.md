# Testing

`testAdmin(admin)` from `@tbtop/admin/testing` is the PHP `tbtop()` testing API with
the same method names. The PHP guide, [`docs/ai/testing.md`](../../../docs/ai/testing.md),
covers what each tester checks. This page is about what differs in TypeScript.

```ts
import { expect, test } from "bun:test";
import { testAdmin } from "@tbtop/admin/testing";
import { admin, postEdit, postsIndex } from "../src/admin";

const t = testAdmin(admin, { as: { id: 1, role: "editor" } });

test("edits a post", async () => {
	const page = await t.page(postEdit, { post: 2 });
	page.assertOk().assertFieldValue("title", "Second post");

	(await page.fill({ title: "Renamed" }).submit()).assertHasNoErrors().assertNotified("Saved");
});

test("lists and deletes posts", async () => {
	const posts = (await t.page(postsIndex)).table("posts");

	(await posts.search("second").fetch()).assertCanSeeRecords(2).assertTotal(1);
	(await posts.callRowAction("delete", 2)).assertTableRefreshed("posts");
});
```

- **Requests go through `admin.handle()`**, with Inertia headers and cookies carried
  between calls, so `authorize()`, the guest gate, validation and the session flash all
  run. No server is started.
- **Acting as a user:** `{ as }` on `testAdmin()` sets the user for every page,
  `t.page(def, params, { as })` overrides it for one. Leave it out to test as a guest;
  there is no implicit login. The user goes straight into the request context, so the
  panel's `user` resolver and the session's user are not consulted; the session still
  carries the flash, form errors and locale. `@tbtop/admin/testing` is for test code
  only: keep it out of server routes and production bundles.
- **Async only where a request is made:** `t.page()`, `submit()`, `fetch()`,
  `call*Action()`, `openAction()` and `openRowAction()` return promises. Every assertion
  is synchronous and chains.
- **Tables fetch explicitly.** `search()`, `filter()`, `sort()`, `tab()`, `page()` and
  `perPage()` collect the query; `await table.fetch()` loads the rows the assertions read.
  An assertion after a query change without a new `fetch()` fails. A row action fetches
  on its own when nothing was fetched yet.
- **Records** are a key, a projected row (`_key`) or a stored record (`id`).
- **Failures** throw `TbtopAssertionError`, which any test runner reports. Assertions
  do not count towards `expect()` totals.
- **Form errors** come from the session, where the panel keeps the first message per field,
  so `errors()` holds one message per field after a submit. An action's 422 carries them
  all.
