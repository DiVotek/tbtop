<?php

namespace Tbtop\Admin\Dsl\Fields;

use Closure;
use InvalidArgumentException;
use Tbtop\Admin\Dsl\Concerns\HasStringRules;
use Tbtop\Admin\Dsl\Node;

final class Password extends Field
{
    use HasStringRules;

    private bool $secret = false;

    private bool $clearable = false;

    private ?Closure $preview = null;

    /** What the form's record holds for this field, seeded by FormBuilder; never serialized. */
    private mixed $stored = null;

    protected function kind(): string
    {
        return 'password';
    }

    /**
     * Keeps a stored value out of the browser: the record's value never ships,
     * the form shows whether one is set with a Replace button, and a field the
     * user leaves alone is absent from the submitted data — so
     * `$model->update($ctx->form)` keeps the stored secret. For a top-level
     * form field (sections and tabs included), not a repeater sub-field.
     */
    public function secret(bool $state = true): static
    {
        $this->secret = $state;

        return $this;
    }

    /**
     * Adds a Clear button to a secret() field; clearing submits `null`. Without
     * it a `null` for this field is dropped on the server, so the stored value
     * can only be replaced. Implies secret(). Not shown on a required() field.
     */
    public function clearable(bool $state = true): static
    {
        $this->clearable = $state;

        return $state ? $this->secret() : $this;
    }

    /**
     * Server closure `fn (string $value): string` shown beside the "Set" badge,
     * e.g. `fn ($v) => '…'.substr($v, -4)`. Only its result reaches the
     * browser. Implies secret().
     *
     * @param  Closure(string): string  $fn
     */
    public function preview(Closure $fn): static
    {
        $this->preview = $fn;

        return $this->secret();
    }

    public function isSecret(): bool
    {
        return $this->secret;
    }

    public function isClearable(): bool
    {
        return $this->secret && $this->clearable;
    }

    /** Whether the seeded record holds a value for this field. */
    public function hasStoredValue(): bool
    {
        return $this->stored !== null && $this->stored !== '' && $this->stored !== [];
    }

    /** Called by FormBuilder with the record's raw value before the record is stripped. */
    public function seedStored(mixed $value): void
    {
        $this->stored = $value;
    }

    /**
     * A secret field's rules: `nullable` so a clear passes the string rules,
     * and `sometimes` once a value is stored, so `required` holds while the
     * field is left alone (absent) yet still refuses a clear.
     *
     * @return list<string>
     */
    public function ruleEntries(): array
    {
        $rules = parent::ruleEntries();
        if (! $this->secret) {
            return $rules;
        }
        $marker = $this->hasStoredValue() ? ['sometimes', 'nullable'] : ['nullable'];

        return array_values(array_unique([...$marker, ...$rules]));
    }

    public function toNode(): Node
    {
        if ($this->secret) {
            $this->opts['secret'] = $this->secretState();
        } else {
            unset($this->opts['secret']);
        }

        return parent::toNode();
    }

    /** @return array{filled: bool, clearable?: true, preview?: string} */
    private function secretState(): array
    {
        $state = ['filled' => $this->hasStoredValue()];
        if ($this->isClearable() && ! $this->isRequiredField()) {
            $state['clearable'] = true;
        }
        $preview = $this->previewText();
        if ($preview !== null) {
            $state['preview'] = $preview;
        }

        return $state;
    }

    private function previewText(): ?string
    {
        if ($this->preview === null || ! is_string($this->stored) || $this->stored === '') {
            return null;
        }
        $text = ($this->preview)($this->stored);
        if (! is_string($text)) {
            throw new InvalidArgumentException("password \"{$this->name}\": preview() must return a string.");
        }

        return $text;
    }

    private function isRequiredField(): bool
    {
        return in_array('required', parent::ruleEntries(), true);
    }
}
