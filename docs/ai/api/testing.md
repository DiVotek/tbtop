<!-- GENERATED — do not edit by hand.
     Source: docblocks in packages/php/src. Regenerate with:
     cd packages/php && UPDATE_FIXTURES=1 vendor/bin/pest --filter ApiReference -->

# Testing

> Back to [the AI guide](../README.md). Prose, gotchas and worked examples live in
> the hand-written docs; this page is the exhaustive method list.

The testing API: `tbtop(Page::class, $params)` (or `$this->tbtop()` with the `InteractsWithTbtop` trait) visits a page through its real endpoints and asserts on the wire. Guide in [testing.md](../testing.md).

## PageTester

`Tbtop\Admin\Testing\PageTester`

| Method | What it does |
|---|---|
| `assertActionHidden(string $name): self` | The action is off the wire (authorize(), when()) or hidden(). |
| `assertActionVisible(string $name): self` | The action is on the wire — authorize() and when() kept it — and not hidden(). |
| `assertFieldDisabled(string $name): self` | The field is on the wire with disabled() set. |
| `assertFieldEnabled(string $name): self` | The field is on the wire without disabled(). |
| `assertFieldHidden(string $name): self` | The field is off the wire (when(), authorize()) or hidden(). |
| `assertFieldValue(string $name, mixed $value): self` | The value the field is prefilled with, from its form's record. Dotted names reach into arrays. |
| `assertFieldVisible(string $name): self` | The field is on the wire — when() and authorize() kept it — and not hidden(). |
| `assertForbidden(): self` | 403 from the page gate (can()). |
| `assertOk(): self` | The page rendered: 200. |
| `assertStatus(int $status): self` | The page visit answered this HTTP status. |
| `assertTitle(string $title): self` | The page's title() as the header shows it. |
| `callAction(string $name, array $form = [], Model\|array\|null $row = null, iterable $selection = []): Result` | Run an action the way a click does. A server action posts to its endpoint; a modal action opens, takes $form and submits through its one form action; a submit action submits its form. |
| `fill(array $data): FormTester` | Fill the page's only form: form()->fill($data). |
| `form(?string $name = null): FormTester` | A form on the page, outside any modal. The name may be left out when there is only one. |
| `openAction(string $name, Model\|array\|null $row = null, iterable $selection = []): ModalTester` | Open a modal action without submitting it: its query() runs, and its form can be checked, filled and submitted. |
| `response(): TestResponse` | The page visit's raw response, for a check the tester does not cover. |
| `table(?string $name = null): TableTester` | A table on the page. The name may be left out when there is only one. |
| `url(?string $endpoint = null, ?string $name = null): string` | The page's URL, or one of its endpoints for the ones the tester does not wrap yet: url('table', 'posts'), url('liveRegion', 'preview'). |

## FormTester

`Tbtop\Admin\Testing\FormTester`

| Method | What it does |
|---|---|
| `callAction(string $name): Result` | Run an action inside this form with the filled values, the way a footer button sends them. |
| `fill(array $data): self` | Set field values over the prefilled record. Dotted keys reach into repeaters and nested arrays; an unknown field fails. |
| `submit(): Result` | Post the form to its submit handler. |

## ModalTester

`Tbtop\Admin\Testing\ModalTester`

| Method | What it does |
|---|---|
| `assertForbidden(): self` | The query() was refused: 403 from the page gate or an authorize() check. |
| `assertFormData(array $expected): self` | The modal opens with these values — a subset of its query() data, or of its form's default record. |
| `callAction(string $name): Result` | Run one of the modal's own actions — Cancel, a second submit — with its current values. |
| `fill(array $data): self` | Set form values over what the modal opened with. |
| `response(): ?TestResponse` | The query() response, when the modal has one. |
| `submit(): Result` | Submit through the modal's one action that takes the form. |

## TableTester

`Tbtop\Admin\Testing\TableTester`

| Method | What it does |
|---|---|
| `assertCanNotSeeRecords(Traversable\|Model\|array\|string\|int $records): self` | None of these records are on the current page of rows. |
| `assertCanSeeRecords(Traversable\|Model\|array\|string\|int $records, bool $inOrder = false): self` | These records are on the current page of rows — in this order with $inOrder. |
| `assertCell(mixed $record, string $column, mixed $value): self` | One cell as the server formatted it for the client. |
| `assertColumnHidden(string $name): self` | The column is off the wire: hidden(), visible() or never declared. |
| `assertColumnVisible(string $name): self` | The column ships to the client: declared, and kept by when() and visibility checks. |
| `assertCountRecords(int $count): self` | Rows on the current page. |
| `assertForbidden(): self` | The table endpoint refused the fetch: 403 from the page gate. |
| `assertTabCount(string $tab, int $count): self` | A count-enabled tab's badge number. |
| `assertTotal(int $total): self` | The total across all pages. A simplePagination() table has none: use assertCountRecords(). |
| `callAction(string $name, array $form = []): Result` | Run one of the table's header actions. |
| `callBulkAction(string $name, Traversable\|Model\|array\|string\|int $records, array $form = []): Result` | Run a bulk action on the selected records. |
| `callRowAction(string $name, mixed $record, array $form = []): Result` | Run a row action on a record, sending its row as the table shows it. The record must be on the current page. |
| `filter(string $name, mixed $value): self` | Set a declared filter, as the filter bar or modal would. |
| `openRowAction(string $name, mixed $record): ModalTester` | Open a row's modal action: its query() runs with that row. |
| `page(int $page): self` | Go to a page of rows. |
| `perPage(int $perPage): self` | Pick a page size; the server falls back to the default for one the table does not offer. |
| `response(): TestResponse` | The last table fetch's raw response. |
| `rows(): array` | The current page of rows, as the client receives them. |
| `search(string $text): self` | Table-wide search over the searchable columns. |
| `searchColumn(string $column, string $text): self` | One column's own search box. |
| `sort(string $column, string $direction = 'asc'): self` | Sort by a visible column, as a header click does. |
| `tab(string $name): self` | Switch to a declared filter tab. |

## Result

`Tbtop\Admin\Testing\Result`

| Method | What it does |
|---|---|
| `assertEffect(string $kind, array $fields = []): self` | An effect of this kind arrived, its fields including $fields. |
| `assertForbidden(): self` | 403 from the page gate or an authorize() check. |
| `assertHalted(?string $message = null): self` | The modal stayed open with a message — haltModal. |
| `assertHasErrors(array\|string $keys = []): self` | Validation failed for these fields. A list names fields; a map also checks the failure — a rule (`'required'`, `'max:200'`) matched by the message it renders, or the message itself. |
| `assertHasNoErrors(array\|string $keys = []): self` | Validation passed — or, given field names, none of these fields failed. A 403, 404 or 5xx fails it. |
| `assertModalClosed(): self` | A closeModal effect: the modal the call came from closes. |
| `assertNoEffects(?string $kind = null): self` | No effect of this kind arrived — or, without a kind, no effect at all. |
| `assertNotified(string $message, ?string $level = null): self` | A toast with this message, at this level when given. |
| `assertOk(): self` | The call went through: a 2xx, or a form's way back with no validation errors. Any other redirect (a login page, a handler's URL) is not ok; assert a handler's redirect with assertRedirect(). |
| `assertRedirect(?string $url = null): self` | The client is sent elsewhere: a `redirect` effect or an HTTP redirect other than the form's own way back. Without $url, any destination. |
| `assertStatus(int $status): self` | The call answered this HTTP status — 422 for an action's validation failure. |
| `assertTableRefreshed(?string $table = null): self` | A refreshTable effect — for this table when named, else any. |
| `effects(): array` | The effects that arrived, in order. |
| `errors(): array` | Validation messages per field. |
| `response(): TestResponse` | The raw response, for a check the tester does not cover. |
