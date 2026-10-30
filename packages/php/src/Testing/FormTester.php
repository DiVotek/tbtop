<?php

namespace Tbtop\Admin\Testing;

use PHPUnit\Framework\Assert;

/**
 * A page form, holding the values the client would post: the record it was
 * prefilled with, overlaid by fill().
 */
final class FormTester
{
    /** @param  array<string, mixed>  $data */
    public function __construct(
        private readonly PageVisit $visit,
        private readonly string $name,
        private array $data,
    ) {}

    /**
     * Set field values over the prefilled record. Dotted keys reach into
     * repeaters and nested arrays; an unknown field fails.
     *
     * @param  array<string, mixed>  $data
     */
    public function fill(array $data): self
    {
        // A page that did not render has no fields to check against: post blind.
        $rendered = $this->visit->response->getStatusCode() === 200;
        $fields = $rendered ? $this->visit->fieldNames($this->name) : [];
        foreach ($data as $key => $value) {
            $root = explode('.', (string) $key)[0];
            if ($rendered && ! in_array($root, $fields, true) && ! array_key_exists($root, $this->data)) {
                Assert::fail("Form [{$this->name}] has no field [{$root}]. Fields: ".($fields === [] ? 'none' : implode(', ', $fields)).'.');
            }
            data_set($this->data, (string) $key, $value);
        }

        return $this;
    }

    /** Post the form to its submit handler. */
    public function submit(): Result
    {
        return $this->visit->submit($this->name, $this->data);
    }

    /**
     * Run an action inside this form with the filled values, the way a
     * footer button sends them.
     */
    public function callAction(string $name): Result
    {
        $form = Wire::named($this->visit->trees(), 'form', $this->name)[0]['node'] ?? [];

        return $this->visit->run($this->visit->action($name, $form), $this->data, [], []);
    }
}
