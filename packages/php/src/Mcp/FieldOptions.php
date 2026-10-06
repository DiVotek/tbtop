<?php

namespace Tbtop\Admin\Mcp;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\RuleWalker;
use Tbtop\Admin\Dsl\TableBuilder;
use Tbtop\Admin\Http\RelationSearchResponder;
use Tbtop\Admin\Http\ResolvedPage;
use Tbtop\Admin\Http\SelectOptionsResponder;

/**
 * query()'s options lookup. The field is found inside the named executable's form, not by name
 * across the page as the HTTP endpoints do, so a form hidden by mcp(false) is never read.
 */
final class FieldOptions
{
    /** Whether the lookup serves $field — search() marks exactly these `options: "dynamic"`. */
    public static function isServed(Field $field): bool
    {
        return ($field instanceof Select || $field instanceof Relation) && $field->queryClosure() !== null;
    }

    /**
     * @param  array<string, mixed>  $deps
     * @return array{options: list<array{value: mixed, label: mixed}>}
     */
    public static function ofField(ResolvedPage $resolved, string $executable, string $name, string $search, array $deps): array
    {
        [$slug, $exec] = array_pad(explode(':', $executable, 2), 2, '');
        $page = $resolved->page::slug();
        if ($slug !== $page) {
            throw new AgentError("Executable \"{$executable}\" is not on page \"{$page}\".");
        }
        $form = PageSurface::executable($resolved, $exec)['form'];
        // search() lists a container's row field under this same key: `parent.*.child`.
        $field = $form === null ? null : (RuleWalker::fieldsByKey($form->getFields())[$name] ?? null);
        if ($field === null) {
            throw new AgentError("Field \"{$name}\" is not in the form of \"{$executable}\".");
        }

        return self::serve($field, "Field \"{$name}\"", $search, $deps);
    }

    /**
     * @param  array<string, mixed>  $deps
     * @return array{options: list<array{value: mixed, label: mixed}>}
     */
    public static function ofFilter(TableBuilder $table, string $name, string $search, array $deps): array
    {
        foreach ($table->filterFields() as $field) {
            if ($field->name === $name) {
                return self::serve($field, "Filter \"{$name}\"", $search, $deps);
            }
        }

        throw new AgentError("Unknown filter \"{$name}\" for table \"{$table->name}\".");
    }

    /**
     * @param  array<string, mixed>  $deps
     * @return array{options: list<array{value: mixed, label: mixed}>}
     */
    private static function serve(Field $field, string $what, string $search, array $deps): array
    {
        if (! ($field instanceof Select || $field instanceof Relation) || $field->queryClosure() === null) {
            throw new AgentError("{$what} has no dynamic options; search() lists its options.");
        }
        // The browser holds the request until every parent has a value; a closure
        // that reads $deps['parent'] would otherwise fail on a missing key.
        foreach ($field->dependsOnFields() as $parent) {
            $value = $deps[$parent] ?? null;
            if (! is_scalar($value) || (string) $value === '') {
                throw new AgentError("{$what} needs deps.{$parent} (dependsOn).");
            }
        }
        $request = Request::create('/', 'POST', ['search' => $search, 'deps' => $deps]);

        return ['options' => self::options($field instanceof Select
            ? app(SelectOptionsResponder::class)->respond($request, $field)
            : app(RelationSearchResponder::class)->respond($request, $field))];
    }

    /** @return list<array{value: mixed, label: mixed}> */
    private static function options(JsonResponse $response): array
    {
        $options = $response->getData(true)['options'] ?? [];

        return array_values(array_map(
            static fn (array $o): array => ['value' => $o['value'] ?? null, 'label' => $o['label'] ?? null],
            array_filter(is_array($options) ? $options : [], 'is_array'),
        ));
    }
}
