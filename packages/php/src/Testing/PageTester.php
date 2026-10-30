<?php

namespace Tbtop\Admin\Testing;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Assert;
use Tbtop\Admin\Pages\Page;

/**
 * One admin page, visited the way the React client visits it. Start from
 * tbtop(Page::class, $params) and narrow to a form, a table or an action.
 * Every request goes through the page's real endpoints, so the panel's
 * middleware, the page gate, authorize() and validation all run. Assertions
 * read the wire: what the client would receive, not the PHP builders.
 */
final class PageTester
{
    private readonly PageVisit $visit;

    /**
     * @param  class-string<Page>  $page
     * @param  array<string, mixed>  $params  route parameters of the page's path(); models are fine
     * @param  string|null  $panel  panel id, when the page sits in several panels
     */
    public function __construct(string $page, array $params = [], ?string $panel = null)
    {
        $this->visit = new PageVisit($page, $params, $panel);
    }

    /** The page visit's raw response, for a check the tester does not cover. */
    public function response(): TestResponse
    {
        return $this->visit->response;
    }

    /**
     * The page's URL, or one of its endpoints for the ones the tester does not
     * wrap yet: url('table', 'posts'), url('liveRegion', 'preview').
     */
    public function url(?string $endpoint = null, ?string $name = null): string
    {
        return $endpoint === null ? $this->visit->url : $this->visit->endpoint($endpoint, $name);
    }

    /** The page rendered: 200. */
    public function assertOk(): self
    {
        $this->visit->response->assertOk();

        return $this;
    }

    /** 403 from the page gate (can()). */
    public function assertForbidden(): self
    {
        $this->visit->response->assertForbidden();

        return $this;
    }

    /** The page visit answered this HTTP status. */
    public function assertStatus(int $status): self
    {
        $this->visit->response->assertStatus($status);

        return $this;
    }

    /** The page's title() as the header shows it. */
    public function assertTitle(string $title): self
    {
        Assert::assertSame($title, $this->visit->props()['title'] ?? null, 'The page title differs.');

        return $this;
    }

    /** The field is on the wire — when() and authorize() kept it — and not hidden(). */
    public function assertFieldVisible(string $name): self
    {
        Assert::assertNotTrue($this->visit->field($name)['node']['meta']['hidden'] ?? false, "Field [{$name}] is hidden.");

        return $this;
    }

    /** The field is off the wire (when(), authorize()) or hidden(). */
    public function assertFieldHidden(string $name): self
    {
        foreach (Wire::fields($this->visit->trees(), $name) as $entry) {
            Assert::assertTrue($entry['node']['meta']['hidden'] ?? false, "Field [{$name}] is visible.");
        }
        Wire::pass();

        return $this;
    }

    /** The field is on the wire with disabled() set. */
    public function assertFieldDisabled(string $name): self
    {
        Assert::assertTrue($this->visit->field($name)['node']['meta']['disabled'] ?? false, "Field [{$name}] is not disabled.");

        return $this;
    }

    /** The field is on the wire without disabled(). */
    public function assertFieldEnabled(string $name): self
    {
        Assert::assertNotTrue($this->visit->field($name)['node']['meta']['disabled'] ?? false, "Field [{$name}] is disabled.");

        return $this;
    }

    /** The value the field is prefilled with, from its form's record. Dotted names reach into arrays. */
    public function assertFieldValue(string $name, mixed $value): self
    {
        $form = $this->visit->field(explode('.', $name)[0])['form'];
        Assert::assertEquals($value, data_get($this->visit->record($form), $name), "Field [{$name}] holds a different value.");

        return $this;
    }

    /** The action is on the wire — authorize() and when() kept it — and not hidden(). */
    public function assertActionVisible(string $name): self
    {
        Assert::assertNotTrue($this->visit->action($name)['node']['meta']['hidden'] ?? false, "Action [{$name}] is hidden.");

        return $this;
    }

    /** The action is off the wire (authorize(), when()) or hidden(). */
    public function assertActionHidden(string $name): self
    {
        foreach (Wire::named($this->visit->trees(), 'action', $name) as $entry) {
            Assert::assertTrue($entry['node']['meta']['hidden'] ?? false, "Action [{$name}] is visible.");
        }
        Wire::pass();

        return $this;
    }

    /** A form on the page, outside any modal. The name may be left out when there is only one. */
    public function form(?string $name = null): FormTester
    {
        $forms = array_values(array_filter(Wire::ofKind($this->visit->trees(), 'form'), static fn (array $e): bool => $e['modal'] === null));
        $name ??= count($forms) === 1 ? (string) $forms[0]['node']['name'] : null;
        if ($name === null) {
            Assert::fail('The page has '.count($forms).' forms; name one: '.Wire::nameList($forms).'.');
        }
        if (Wire::named($this->visit->trees(), 'form', $name) === []) {
            Assert::fail($this->visit->missing('Form', $name, $forms));
        }

        return new FormTester($this->visit, $name, $this->visit->record($name));
    }

    /** A table on the page. The name may be left out when there is only one. */
    public function table(?string $name = null): TableTester
    {
        if ($name !== null && $this->visit->response->getStatusCode() !== 200) {
            return new TableTester($this->visit, $name, PageVisit::blind('table', $name)['node']);
        }
        $tables = Wire::ofKind($this->visit->trees(), 'table');
        $name ??= count($tables) === 1 ? (string) $tables[0]['node']['name'] : null;
        if ($name === null) {
            Assert::fail('The page has '.count($tables).' tables; name one: '.Wire::nameList($tables).'.');
        }
        $found = Wire::named($this->visit->trees(), 'table', $name);
        if ($found === []) {
            Assert::fail($this->visit->missing('Table', $name, $tables));
        }

        return new TableTester($this->visit, $name, $found[0]['node']);
    }

    /**
     * Fill the page's only form: form()->fill($data).
     *
     * @param  array<string, mixed>  $data
     */
    public function fill(array $data): FormTester
    {
        return $this->form()->fill($data);
    }

    /**
     * Run an action the way a click does. A server action posts to its
     * endpoint; a modal action opens, takes $form and submits through its
     * one form action; a submit action submits its form.
     *
     * @param  array<string, mixed>  $form  values for the form the action submits
     * @param  Model|array<string, mixed>|null  $row  the record a row-scoped action acts on
     * @param  iterable<Model|int|string>  $selection  records a bulk action acts on
     */
    public function callAction(string $name, array $form = [], Model|array|null $row = null, iterable $selection = []): Result
    {
        return $this->visit->run($this->visit->action($name), $form, Records::row($row), Records::keys($selection));
    }

    /**
     * Open a modal action without submitting it: its query() runs, and its
     * form can be checked, filled and submitted.
     *
     * @param  Model|array<string, mixed>|null  $row
     * @param  iterable<Model|int|string>  $selection
     */
    public function openAction(string $name, Model|array|null $row = null, iterable $selection = []): ModalTester
    {
        return $this->visit->open($this->visit->action($name)['node'], Records::row($row), Records::keys($selection));
    }
}
