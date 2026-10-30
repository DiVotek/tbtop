<?php

namespace Tbtop\Admin\Testing;

use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Assert;

/**
 * The outcome of a form submit or an action call. Both transports — a form's
 * Inertia redirect with flashed effects and session errors, an action's JSON
 * `{effects}` and 422 — land in the same assertions.
 */
final class Result
{
    /**
     * @param  list<array<string, mixed>>  $effects
     * @param  array<string, list<string>>  $errors
     * @param  array<string, string>  $labels  field name → the label the error messages use
     */
    public function __construct(
        private readonly TestResponse $response,
        private readonly array $effects,
        private readonly array $errors,
        private readonly string $subject,
        private readonly array $labels = [],
        private readonly ?string $redirect = null,
    ) {}

    /** The raw response, for a check the tester does not cover. */
    public function response(): TestResponse
    {
        return $this->response;
    }

    /**
     * Validation failed for these fields. A list names fields; a map also
     * checks the failure — a rule (`'required'`, `'max:200'`) matched by the
     * message it renders, or the message itself.
     *
     * @param  string|array<int|string, string|list<string>>  $keys
     */
    public function assertHasErrors(string|array $keys = []): self
    {
        Assert::assertNotSame([], $this->errors, "{$this->subject} has no validation errors.");
        foreach ((array) $keys as $field => $expected) {
            if (is_int($field)) {
                $this->assertFieldHasError((string) $expected);

                continue;
            }
            $this->assertFieldHasError($field);
            foreach ((array) $expected as $one) {
                $this->assertErrorMatches($field, $one);
            }
        }

        return $this;
    }

    /** Validation passed — or, given field names, none of these fields failed. */
    public function assertHasNoErrors(string|array $keys = []): self
    {
        if ($keys === []) {
            Assert::assertSame([], $this->errors, "{$this->subject} has validation errors: ".json_encode($this->errors));

            return $this;
        }
        foreach ((array) $keys as $field) {
            Assert::assertArrayNotHasKey($field, $this->errors, "{$this->subject} has errors on [{$field}]: ".json_encode($this->errors[$field] ?? []));
        }

        return $this;
    }

    /**
     * An effect of this kind arrived, its fields including $fields.
     *
     * @param  array<string, mixed>  $fields
     */
    public function assertEffect(string $kind, array $fields = []): self
    {
        foreach ($this->effects as $effect) {
            if (($effect['kind'] ?? null) === $kind && array_intersect_key($effect, $fields) == $fields) {
                Wire::pass();

                return $this;
            }
        }
        Assert::fail("{$this->subject} sent no [{$kind}] effect matching ".json_encode($fields).'. Effects: '.json_encode($this->effects));
    }

    /** No effect of this kind arrived — or, without a kind, no effect at all. */
    public function assertNoEffects(?string $kind = null): self
    {
        $sent = $kind === null ? $this->effects : array_filter($this->effects, static fn (array $e): bool => ($e['kind'] ?? null) === $kind);
        Assert::assertSame([], array_values($sent), "{$this->subject} sent effects: ".json_encode(array_values($sent)));

        return $this;
    }

    /** A toast with this message, at this level when given. */
    public function assertNotified(string $message, ?string $level = null): self
    {
        return $this->assertEffect('notify', array_filter(['message' => $message, 'level' => $level], static fn ($v): bool => $v !== null));
    }

    /**
     * The client is sent elsewhere: a `redirect` effect or an HTTP redirect
     * other than the form's own way back. Without $url, any destination.
     */
    public function assertRedirect(?string $url = null): self
    {
        $targets = array_values(array_filter([
            $this->redirect,
            ...array_map(static fn (array $e): mixed => ($e['kind'] ?? null) === 'redirect' ? $e['href'] ?? null : null, $this->effects),
        ]));
        Assert::assertNotSame([], $targets, "{$this->subject} redirected nowhere.");
        if ($url !== null) {
            Assert::assertContains(url($url), array_map(static fn (string $t): string => url($t), $targets), "{$this->subject} did not redirect to [{$url}]: ".implode(', ', $targets));
        }

        return $this;
    }

    /** A closeModal effect: the modal the call came from closes. */
    public function assertModalClosed(): self
    {
        return $this->assertEffect('closeModal');
    }

    /** The modal stayed open with a message — haltModal. */
    public function assertHalted(?string $message = null): self
    {
        return $this->assertEffect('haltModal', $message === null ? [] : ['message' => $message]);
    }

    /** A refreshTable effect — for this table when named, else any. */
    public function assertTableRefreshed(?string $table = null): self
    {
        return $this->assertEffect('refreshTable', $table === null ? [] : ['table' => $table]);
    }

    /** 403 from the page gate or an authorize() check. */
    public function assertForbidden(): self
    {
        $this->response->assertForbidden();

        return $this;
    }

    /** The call went through: a 2xx, or a form's redirect with no validation errors. */
    public function assertOk(): self
    {
        $status = $this->response->getStatusCode();
        Assert::assertTrue($status < 300 || ($this->response->isRedirect() && $this->errors === []), "{$this->subject} responded {$status}.");

        return $this;
    }

    /** The call answered this HTTP status — 422 for an action's validation failure. */
    public function assertStatus(int $status): self
    {
        $this->response->assertStatus($status);

        return $this;
    }

    /**
     * The effects that arrived, in order.
     *
     * @return list<array<string, mixed>>
     */
    public function effects(): array
    {
        return $this->effects;
    }

    /**
     * Validation messages per field.
     *
     * @return array<string, list<string>>
     */
    public function errors(): array
    {
        return $this->errors;
    }

    private function assertFieldHasError(string $field): void
    {
        Assert::assertArrayHasKey($field, $this->errors, "{$this->subject} has no error on [{$field}]. Errors: ".json_encode($this->errors));
    }

    private function assertErrorMatches(string $field, string $expected): void
    {
        $candidates = [$expected, ...RuleMessages::for($field, $expected, $this->labels[$field] ?? null)];
        foreach ($this->errors[$field] as $message) {
            if (in_array($message, $candidates, true)) {
                Wire::pass();

                return;
            }
        }
        Assert::fail("{$this->subject} error on [{$field}] is not [{$expected}]: ".json_encode($this->errors[$field]));
    }
}
