<?php

namespace Tbtop\Admin\Testing;

use Illuminate\Support\Arr;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Assert;

/**
 * An opened modal action: what its query() loaded, and the form inside it.
 * submit() posts through the modal's one action that takes the form, with
 * the row or selection the modal was opened for.
 */
final class ModalTester
{
    /**
     * @param  array<string, mixed>  $body
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $row
     * @param  list<int|string>  $selection
     */
    public function __construct(
        private readonly PageVisit $visit,
        private readonly string $name,
        private readonly array $body,
        private readonly ?string $form,
        private array $data,
        private readonly array $row,
        private readonly array $selection,
        private readonly ?TestResponse $response,
    ) {}

    /** The query() response, when the modal has one. */
    public function response(): ?TestResponse
    {
        return $this->response;
    }

    /** The query() was refused: 403 from the page gate or an authorize() check. */
    public function assertForbidden(): self
    {
        Assert::assertNotNull($this->response, "Modal [{$this->name}] has no query() to refuse.");
        $this->response->assertForbidden();

        return $this;
    }

    /**
     * The modal opens with these values — a subset of its query() data, or of
     * its form's default record.
     *
     * @param  array<string, mixed>  $expected
     */
    public function assertFormData(array $expected): self
    {
        foreach ($expected as $key => $value) {
            Assert::assertTrue($value === null || Arr::has($this->data, (string) $key), "Modal [{$this->name}] opens without [{$key}]. Data: ".json_encode($this->data));
            Assert::assertEquals($value, data_get($this->data, (string) $key), "Modal [{$this->name}] opens with a different [{$key}]. Data: ".json_encode($this->data));
        }

        return $this;
    }

    /**
     * Set form values over what the modal opened with.
     *
     * @param  array<string, mixed>  $data
     */
    public function fill(array $data): self
    {
        foreach ($data as $key => $value) {
            data_set($this->data, (string) $key, $value);
        }

        return $this;
    }

    /** Submit through the modal's one action that takes the form. */
    public function submit(): Result
    {
        $actions = array_values(array_filter(
            Wire::ofKind([$this->body], 'action'),
            static fn (array $e): bool => in_array('form', $e['node']['options']['spec']['needs'] ?? [], true)
                || ($e['node']['options']['spec']['type'] ?? null) === 'submit',
        ));
        if (count($actions) !== 1) {
            Assert::fail("Modal [{$this->name}] has ".count($actions).' actions that submit its form ('.Wire::nameList($actions).'); call one with callAction().');
        }

        return $this->run($actions[0]);
    }

    /** Run one of the modal's own actions — Cancel, a second submit — with its current values. */
    public function callAction(string $name): Result
    {
        return $this->run($this->visit->action($name, $this->body));
    }

    /** @param  array{node: array<string, mixed>, form: ?string, modal: ?string}  $entry */
    private function run(array $entry): Result
    {
        $spec = $entry['node']['options']['spec'] ?? [];
        if (($spec['type'] ?? null) === 'submit') {
            return (new FormTester($this->visit, (string) ($spec['form'] ?? $this->form), $this->data))->submit();
        }
        if (($spec['type'] ?? null) !== 'server') {
            return $this->visit->run($entry, $this->data, $this->row, $this->selection);
        }

        return $this->visit->post((string) $entry['node']['name'], $spec['needs'] ?? [], $this->data, $this->row, $this->selection, $this->form);
    }
}
