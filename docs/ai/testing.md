# Testing admin pages

> Back to [the AI guide](./README.md). Every method, generated from source:
> [api/testing.md](./api/testing.md).

`tbtop(Page::class, $params)` visits a page the way the React client does and returns a
`PageTester`. From there a test narrows to a form, a table or an action, and every call goes
through the page's real endpoints: the panel middleware, the page gate (`can()`),
`authorize()` and validation all run. Assertions read the wire — the StructureNode JSON,
table rows and effects the client receives — so a refactor that keeps the screen the same
keeps the tests green.

```php
it('creates a post', function () {
    $this->actingAs(User::factory()->create());

    tbtop(CreatePostPage::class)
        ->fill(['title' => 'Hello'])
        ->submit()
        ->assertHasNoErrors()
        ->assertRedirect();

    expect(Post::where('title', 'Hello')->exists())->toBeTrue();
});
```

- **Pest:** `tbtop()` is a global function the package autoloads; nothing to register.
- **PHPUnit:** `use Tbtop\Admin\Testing\InteractsWithTbtop;` in the test case, then
  `$this->tbtop(Page::class)`.
- **No implicit login.** The tester acts as whoever `actingAs()` set — guests and roles
  are tested explicitly.
- **Params** are the page path's route parameters; models are fine:
  `tbtop(EditPostPage::class, ['post' => $post])`. A page in several panels takes the panel
  id as the third argument.

## The page

```php
tbtop(EditPostPage::class, ['post' => $post])
    ->assertOk()
    ->assertTitle('Edit post')
    ->assertFieldVisible('title')
    ->assertFieldHidden('internal_notes')   // when()/authorize() kept it off the wire, or hidden()
    ->assertFieldDisabled('slug')
    ->assertFieldValue('title', 'Hello')    // the form's record()
    ->assertActionVisible('publish')
    ->assertActionHidden('delete');         // authorize() dropped it
```

Client-side conditions (`hiddenIf`, `disabledIf`) are not evaluated: the tester reads what
the server sends. Rendering, clicks and the client's zod checks belong in browser tests.

## Forms

```php
tbtop(CreatePostPage::class)
    ->form('post')                     // optional when the page has one form outside modals
    ->fill(['title' => '', 'sections.0.heading' => 'Intro'])
    ->submit()
    ->assertHasErrors(['title' => 'required']);
```

`fill()` starts from the record the form was prefilled with, so an edit test only names the
fields it changes. A key that is no field of the form fails at once. `submit()` posts to the
form's `onSubmit()` handler like Inertia does, then reads the flashed effects or the session
errors; `form()->callAction('quickSave')` runs a form action with the filled values instead.

## Actions and modals

```php
$page = tbtop(PostsIndexPage::class);

$page->callAction('publish', row: $post);                   // a server action
$page->callAction('create', form: ['title' => 'From modal'])  // a modal: opened, filled, submitted
    ->assertHasNoErrors()
    ->assertModalClosed();

$page->openAction('edit', $post)                            // query() runs, nothing submitted yet
    ->assertFormData(['title' => $post->title])
    ->fill(['title' => 'Renamed'])
    ->submit();                                             // the modal's one action that takes the form
```

A modal with two form actions (Save, Save and close) needs `->callAction('saveAndClose')`
on the `ModalTester` instead of `submit()`. A `url()` or `custom()` action makes no server
call, so calling one fails; assert it with `assertActionVisible()`.

## Results

`submit()` and every `call*()` return a `Result`. The two transports — a form's redirect
with flashed effects and session errors, an action's JSON effects and 422 — share one set of
assertions:

| Assertion | Checks |
|---|---|
| `assertHasErrors(['title' => 'required'])` | A failed field; a rule (matched by the message it renders) or the message itself. A list or a string names fields only |
| `assertHasNoErrors()` | No validation errors, and no 5xx |
| `assertEffect('setFormData', ['data' => [...]])` / `assertNoEffects()` | An effect of the closed set, its fields a subset |
| `assertNotified('Saved', 'success')` | A `notify` effect |
| `assertRedirect($url)` | A `redirect` effect, or a form handler that returned a URL |
| `assertModalClosed()` / `assertHalted('Not yet')` | `closeModal` / `haltModal` |
| `assertTableRefreshed('posts')` | `refreshTable` |
| `assertForbidden()` / `assertStatus(422)` | The HTTP status |

`->response()` on any tester returns the raw `TestResponse` for anything else.

## Tables

```php
$posts = tbtop(PostsIndexPage::class)->table('posts');   // name optional with one table

$posts->search('hello')
    ->filter('status', 'draft')
    ->sort('created_at', 'desc')
    ->tab('mine')
    ->assertCanSeeRecords([$draft])
    ->assertCanNotSeeRecords([$published])
    ->assertCell($draft, 'status', 'Draft')   // the value as the server formatted it
    ->assertTotal(1);

$posts->page(2)->perPage(50)->assertCountRecords(3);
$posts->assertTabCount('draft', 4)->assertColumnHidden('secret');
```

- `search()`, `filter()`, `sort()`, `tab()`, `page()` and `perPage()` collect the query;
  rows are fetched on the next assertion. An undeclared filter, tab, column or a column
  without `sortable()` fails at once instead of quietly returning every row.
- Records are a model, a collection, a key or a row; rows match by `_key`.
- `assertTotal()` needs a length-aware table; with `simplePagination()` use
  `assertCountRecords()`.

```php
$posts->callRowAction('delete', $post)->assertTableRefreshed();
$posts->callBulkAction('publish', [$a, $b])->assertNotified('2 posts published');
$posts->openRowAction('edit', $post)->assertFormData(['title' => $post->title]);
$posts->callAction('create', form: ['title' => 'New']);       // a table header action
```

A row action sends the row the way the table shows it, so the record must be on the current
page of rows (search, tab or page to it). After a call the next assertion fetches the rows
again.

## Gates

```php
$this->actingAs($viewer);

tbtop(SettingsPage::class)->assertForbidden();
tbtop(SettingsPage::class)->table('audit')->assertForbidden();
tbtop(SettingsPage::class)->form('settings')->submit()->assertForbidden();
```

A page that does not render has no wire to read, so the tester sends calls blind: each
endpoint answers on its own, which is how a test proves the gate holds there too. An action
`authorize()` removes is off the wire: assert it with `assertActionHidden()`.

## Generated tests

`make:tbtop-resource Post --tests` writes `tests/Feature/Admin/PostsTest.php` on this API:
list (and search), create (and a required field left empty), edit, delete one and a
selection, plus view, restore and force delete, and a policy-refusal case when the flags ask
for them. Records come from the model's factory; without one, the file ends with a helper of
sample values to check. Under `--policy` a `Gate::before` stands in for the policy stub, so
the cases pass before it is written.

## Not covered yet

Live regions, select and relation search and option creation, uploads, inline-editable
cells, reorder, stat and chart data, and MCP tools. Until they land, reach their endpoints
with `->url('relationSearch', 'author_id')` and `$this->postJson()`.
