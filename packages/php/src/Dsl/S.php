<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;

/**
 * Structure DSL entry — mirrors the client `s.*` builders and collects
 * the request-scoped registries (forms, actions) the HTTP layer resolves.
 *
 * @method FieldBuilder text(string $name)
 * @method FieldBuilder textarea(string $name)
 * @method FieldBuilder password(string $name)
 * @method FieldBuilder number(string $name)
 * @method FieldBuilder date(string $name)
 * @method FieldBuilder datetime(string $name)
 * @method FieldBuilder boolean(string $name)
 * @method FieldBuilder select(string $name)
 * @method FieldBuilder radio(string $name)
 * @method FieldBuilder tags(string $name)
 * @method FieldBuilder checkbox(string $name)
 * @method FieldBuilder colorpicker(string $name)
 * @method FieldBuilder keyvalue(string $name)
 * @method FieldBuilder translatable(string $name)
 * @method FieldBuilder slug(string $name)
 * @method FieldBuilder upload(string $name)
 * @method FieldBuilder relation(string $name)
 * @method FieldBuilder repeater(string $name)
 */
final class S
{
    private const FIELD_KINDS = [
        'text', 'textarea', 'password', 'number', 'date', 'datetime', 'boolean',
        'select', 'radio', 'tags', 'checkbox', 'colorpicker', 'keyvalue',
        'translatable', 'slug', 'upload', 'relation', 'repeater',
    ];

    /** @var array<string, FormBuilder> */
    private array $forms = [];

    /** @var array<string, ActionBuilder> */
    private array $actions = [];

    /** @param  list<mixed>  $args */
    public function __call(string $kind, array $args): FieldBuilder
    {
        if (! in_array($kind, self::FIELD_KINDS, true)) {
            throw new InvalidArgumentException("Unknown field kind \"{$kind}\".");
        }
        $name = $args[0] ?? null;
        if (! is_string($name)) {
            throw new InvalidArgumentException("Field \"{$kind}\" needs a name as first argument.");
        }

        return new FieldBuilder($kind, $name);
    }

    /** @param  list<mixed>  $children @param  array<string, mixed>  $opts */
    public function stack(array $children, array $opts = []): Node
    {
        return self::layout('stack', $children, $opts);
    }

    /** @param  list<mixed>  $children @param  array<string, mixed>  $opts */
    public function row(array $children, array $opts = []): Node
    {
        return self::layout('row', $children, $opts);
    }

    /** @param  array<string, mixed>  $opts @param  list<mixed>  $children */
    public function grid(array $opts, array $children): Node
    {
        return self::layout('grid', $children, $opts);
    }

    /** @param  array<string, mixed>  $opts @param  list<mixed>  $children */
    public function section(array $opts, array $children): Node
    {
        return self::layout('section', $children, $opts);
    }

    public function heading(string $text, int $level = 3): Node
    {
        return new Node('heading', ['text' => $text, 'level' => $level]);
    }

    public function description(string $text): Node
    {
        return new Node('description', ['text' => $text]);
    }

    public function divider(): Node
    {
        return new Node('divider');
    }

    /** @param  list<mixed>  $children */
    public function form(string $name, array $children): FormBuilder
    {
        return $this->forms[$name] = new FormBuilder($name, $children);
    }

    /** @param  array<string, mixed>  $opts */
    public function table(string $name, array $opts): Node
    {
        [$options, $meta] = Meta::split($opts);

        return new Node('table', [...$options, 'name' => $name], $name, $meta);
    }

    /** @param  array<string, mixed>  $opts */
    public function chart(string $type, array $opts): Node
    {
        [$options, $meta] = Meta::split($opts);

        return new Node("chart:{$type}", [...$options, 'type' => $type], null, $meta);
    }

    public function action(string $name): ActionBuilder
    {
        return $this->actions[$name] = new ActionBuilder($name);
    }

    /** @param  list<ActionBuilder>  $actions */
    public function actionsRow(array $actions): Node
    {
        return new Node('row', ['children' => $actions]);
    }

    /** @return array<string, FormBuilder> */
    public function collectedForms(): array
    {
        return $this->forms;
    }

    /** @return array<string, ActionBuilder> */
    public function collectedActions(): array
    {
        return $this->actions;
    }

    /** @param  list<mixed>  $children @param  array<string, mixed>  $opts */
    private static function layout(string $kind, array $children, array $opts): Node
    {
        [$options, $meta] = Meta::split($opts);

        return new Node($kind, [...$options, 'children' => $children], null, $meta);
    }
}
