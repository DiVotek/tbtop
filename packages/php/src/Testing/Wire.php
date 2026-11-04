<?php

namespace Tbtop\Admin\Testing;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\Constraint\IsAnything;
use Tbtop\Admin\Dsl\S;

/**
 * A walk over the StructureNode JSON a page ships — the wire, not the PHP
 * builders, so a tester sees exactly what the client receives, after every
 * when() and authorize() verdict.
 *
 * @internal
 */
final class Wire
{
    /**
     * Every node under $tree with the form and modal action it sits in.
     *
     * @param  array<mixed>  $tree
     * @return list<array{node: array<string, mixed>, form: ?string, modal: ?string}>
     */
    public static function nodes(array $tree, ?string $form = null, ?string $modal = null): array
    {
        $out = [];
        if (self::isNode($tree)) {
            /** @var array<string, mixed> $tree */
            $out[] = ['node' => $tree, 'form' => $form, 'modal' => $modal];
            $name = is_string($tree['name'] ?? null) ? $tree['name'] : null;
            $form = $tree['kind'] === 'form' ? $name : $form;
            $modal = $tree['kind'] === 'action' && ($tree['options']['spec']['type'] ?? null) === 'modal' ? $name : $modal;
        }
        foreach ($tree as $child) {
            if (is_array($child)) {
                array_push($out, ...self::nodes($child, $form, $modal));
            }
        }

        return $out;
    }

    /**
     * Nodes of one kind.
     *
     * @param  array<mixed>  $tree
     * @return list<array{node: array<string, mixed>, form: ?string, modal: ?string}>
     */
    public static function ofKind(array $tree, string $kind): array
    {
        return array_values(array_filter(self::nodes($tree), static fn (array $e): bool => $e['node']['kind'] === $kind));
    }

    /**
     * Nodes of one kind carrying $name.
     *
     * @param  array<mixed>  $tree
     * @return list<array{node: array<string, mixed>, form: ?string, modal: ?string}>
     */
    public static function named(array $tree, string $kind, string $name): array
    {
        return array_values(array_filter(
            self::nodes($tree),
            static fn (array $e): bool => ($e['node']['name'] ?? null) === $name && $e['node']['kind'] === $kind,
        ));
    }

    /**
     * Field nodes named $name — a field kind, inside a form.
     *
     * @param  array<mixed>  $tree
     * @return list<array{node: array<string, mixed>, form: ?string, modal: ?string}>
     */
    public static function fields(array $tree, ?string $name = null): array
    {
        $kinds = array_keys(S::builtInKindClasses());

        return array_values(array_filter(
            self::nodes($tree),
            static fn (array $e): bool => $e['form'] !== null
                && in_array($e['node']['kind'], $kinds, true)
                && is_string($e['node']['name'] ?? null)
                && ($name === null || $e['node']['name'] === $name),
        ));
    }

    /**
     * Distinct names of the nodes of one kind, for "did you mean" failures.
     *
     * @param  list<array{node: array<string, mixed>, form: ?string, modal: ?string}>  $entries
     */
    public static function nameList(array $entries): string
    {
        $names = array_unique(array_filter(array_map(
            static fn (array $e): ?string => is_string($e['node']['name'] ?? null) ? $e['node']['name'] : null,
            $entries,
        )));

        return $names === [] ? 'none' : implode(', ', $names);
    }

    /** Count a check that passed by finding nothing wrong, so the test is not reported risky. */
    public static function pass(): void
    {
        Assert::assertThat(null, new IsAnything);
    }

    /** @param  array<mixed>  $value */
    private static function isNode(array $value): bool
    {
        return is_string($value['kind'] ?? null) && (array_key_exists('options', $value) || array_key_exists('meta', $value));
    }
}
