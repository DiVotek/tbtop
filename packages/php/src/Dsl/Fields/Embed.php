<?php

namespace Tbtop\Admin\Dsl\Fields;

use Illuminate\Support\Facades\Validator as ValidatorFactory;
use Illuminate\Validation\Validator;
use InvalidArgumentException;
use JsonSerializable;
use Tbtop\Admin\Dsl\ChildInclusion;
use Tbtop\Admin\Dsl\RuleWalker;
use Tbtop\Admin\Dsl\StructureWalk;

/**
 * A block kind for Richtext::embeds(), stored as `{type:'embed', version:1, id, kind, data}`.
 * Not a field kind: its data is edited through a modal DSL form.
 */
final class Embed implements JsonSerializable
{
    private ?string $label = null;

    private ?string $icon = null;

    private ?string $summary = null;

    /** @var list<mixed> */
    private array $fields = [];

    private function __construct(public readonly string $kind) {}

    /** Starts an embed of the given kind — the `kind` written into every stored node. */
    public static function make(string $kind): static
    {
        if ($kind === '') {
            throw new InvalidArgumentException('An embed kind cannot be empty.');
        }

        return new self($kind);
    }

    /** Name shown on the card, in the slash menu, the "Block" dropdown and as the modal title; defaults to the kind. */
    public function label(string $label): static
    {
        $this->label = $label;

        return $this;
    }

    /** Icon shown on the card and in the insert menus (same icon names as elsewhere in the admin). */
    public function icon(string $icon): static
    {
        $this->icon = $icon;

        return $this;
    }

    /**
     * Name of the field whose value is the card's one-line summary. A value
     * that is not a non-empty string falls back to the label.
     */
    public function summary(string $field): static
    {
        $this->summary = $field;

        return $this;
    }

    /**
     * The modal form's fields; the embed's `data` is exactly what they return.
     * ->translatable() on them is ignored (a document is already per-locale),
     * and a richtext with its own embeds() is rejected — embeds do not nest.
     *
     * @param  list<mixed>  $fields
     */
    public function fields(array $fields): static
    {
        foreach (self::descendantFields($fields) as $field) {
            self::assertNotNested($field);
            $field->translatable(false);
        }
        $this->fields = $fields;

        return $this;
    }

    public function labelText(): string
    {
        return $this->label ?? $this->kind;
    }

    /**
     * The fields that exist this request (the ->when() / ->authorize() verdict applied).
     *
     * @return list<mixed>
     */
    public function includedFields(): array
    {
        return ChildInclusion::filter($this->fields);
    }

    /**
     * $data checked against this embed's fields, with their labels as attributes —
     * the one rule set shared by the modal's "Apply" and the save rule.
     *
     * @param  array<mixed>  $data
     */
    public function getValidator(array $data): Validator
    {
        $fields = $this->includedFields();

        return ValidatorFactory::make($data, RuleWalker::collect($fields), [], RuleWalker::collectAttributes($fields));
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return [
            'kind' => $this->kind,
            'label' => $this->labelText(),
            'icon' => $this->icon,
            'summary' => $this->summary,
            'fields' => $this->includedFields(),
        ];
    }

    /**
     * @param  list<mixed>  $children
     * @return list<Field>
     */
    private static function descendantFields(array $children): array
    {
        $out = [];
        foreach ($children as $child) {
            foreach (StructureWalk::collect($child, static fn (mixed $c): bool => $c instanceof Field) as $field) {
                if ($field instanceof Field) {
                    $out[] = $field;
                }
            }
        }

        return $out;
    }

    private static function assertNotNested(Field $field): void
    {
        if ($field instanceof Richtext && $field->getEmbeds() !== []) {
            throw new InvalidArgumentException(
                "Richtext \"{$field->name}\" declares embeds() inside an embed's fields; embeds do not nest.",
            );
        }
    }
}
