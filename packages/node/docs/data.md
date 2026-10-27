# Data, auth and uploads

## Query driver

The ORM is the host's. Tables, relation selects and drag-reorder run through a
`QueryDriver`: `where`, `searchAny`, `orderBy`, `count`, `rows`, `update`.
A table's `.query()` returns a query object of the driver's type.
A `simplePagination()` table never calls `count`: it reads the page, and on a
full page one more row (`rows` with `perPage: 1`) to answer whether a next
page exists.

- `kyselyDriver(db, keyName = "id")` from `/kysely`: `.query()` returns a
  `selectFrom(...)` builder.
- `memoryDriver()` with `memoryQuery(() => rows)` from `/memory`: for tests.
- Anything else (Drizzle, Prisma, a REST API): implement the six methods.

Form loading and saving is the page's code: read the record in `view`, fill
the form with `.record(row)`, write it in `onSubmit`.

## Validation

Field rules are Laravel's rule strings with Laravel's messages. A rule the
package cannot check alone throws, so the host supplies it in `hostRules`:

```ts
import { kyselyRules } from "@tbtop/admin/kysely";
createAdmin({ hostRules: kyselyRules(db) /* unique, exists */ });
```

A host rule is `{ message, check(value, args) }`; `check` may return a string
to fail with that message. `sometimes` and `bail` work as in Laravel.

Input reaches the rules the way Laravel's default middleware leaves it:
`TrimStrings`, then `ConvertEmptyStringsToNull`. Every string in a request
(form submits, action payloads, cell saves, table query params, MCP calls) is
trimmed, nested arrays and objects included, with zero-width spaces and the BOM.
`password`, `password_confirmation` and `current_password` are never trimmed,
nor is a richtext document (its Lexical JSON is stored as written; embed data
inside it is trimmed). `trimStrings` takes more keys, by name or dotted tail,
or `false` to turn trimming off:

```ts
createAdmin({ trimStrings: { except: ["signature", "links.*.label"] } });
```

## Sessions

`session` takes a resolver `(request) => SessionStore`:

- `memorySessions({ secure, path, lifetime })`: in-process, one server only.
  Nothing is stored until something is set; idle sessions expire after
  `lifetime` seconds; signing in or out moves the session to a new id. It is
  the default, with a cookie per panel (`tbtop_{id}_session`) scoped to the prefix.
- `cookieSessions({ secret, maxAge?, path?, secure? })`: everything in one
  encrypted cookie (AES-GCM, 4 KB limit). No store, so it works on Workers and
  behind a load balancer. `secret` needs 32+ characters. The expiry is sealed
  inside, so a copied cookie stops working after `maxAge` (default 7200 s, as
  Laravel's session lifetime) even though logout cannot revoke it earlier.
- Your own: `{ get, set, forget, commit? }` over Redis, a database, etc.

`context: (request) => ({ can, timezone, ... })` gives the DSL a Gate-style
`can(ability, args)` for `authorize()` and other request-scoped settings.
A page's `authorize(ctx)` returning false answers 403 and hides it from the nav.

## Uploads

The `upload` field stores through a `Disk`. Configure disks by name; `public`
is the default:

```ts
import { localDisk } from "@tbtop/admin/local-disk";
import { sharpImages } from "@tbtop/admin/sharp";
import sharp from "sharp";
import DOMPurify from "isomorphic-dompurify"; // any sanitizer; plain DOMPurify needs a DOM

createAdmin({
	disks: { public: localDisk("storage/app/public", "/storage") },
	secret: process.env.APP_KEY, // signs private file URLs
	images: sharpImages(sharp), // only when a field uses convertTo()
	sanitizeSvg: (svg) => DOMPurify.sanitize(svg), // without it SVG is refused
});
```

`memoryDisk()` and `r2Disk(bucket, publicUrl)` come from the main entry. The
host serves public files itself (`/storage/...`); private ones stream through
the admin on signed, expiring URLs. There is no media library.

## Notifications

`notifications: { store, pollInterval }` turns on the header bell.
`memoryNotifications()` is the in-process store; `kyselyNotifications(db, options)`
uses Laravel's `notifications` table, so a Node panel and a Laravel app can
share it. Send with the `Notification` builder:

```ts
await Notification.make().title("Export ready").success().sendTo(store, [user]);
```
