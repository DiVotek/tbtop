<?php

namespace Tbtop\Admin\Support\ApiReference;

use ReflectionMethod;
use ReflectionNamedType;

/**
 * Splits a class's public methods into authoring surface (documented) and internals.
 *
 * The rule is the codebase's own convention: authoring methods are fluent and return
 * self/static; everything else serves the HTTP layer. Anything the heuristic cannot
 * place lands in UNCLASSIFIED and fails the API-reference test, forcing an explicit
 * decision instead of silently dropping a method from the docs.
 *
 * @internal
 */
final class MethodClassifier
{
    /** Non-fluent methods that are still authoring surface. */
    private const AUTHORING_EXCEPTIONS = [
        'Tbtop\Admin\Dsl\S' => [
            'stack', 'row', 'flex', 'grid', 'section', 'collapsible', 'aside',
            'actionGroup', 'dropdown', 'tabs', 'displayText', 'displayHtml',
            'markdown', 'displayDivider', 'displayAlert', 'displayValue',
            'displayImage', 'displayRichtext', 'displayKeyValue', 'navMenu',
            'userMenu', 'logo', 'localeSwitcher', 'spacer', 'unsavedIndicator',
            'notifications', 'themeToggle', 'form', 'table', 'stat', 'list',
            'chart', 'action', 'liveRegion', 'actionsRow', 'inFilter', 'register',
        ],
        'Tbtop\Admin\Notifications\Notification' => ['sendToDatabase'],
        'Tbtop\Admin\Panels\Chrome' => ['header', 'sidebar', 'footer'],
        'Tbtop\Admin\Panels\PanelConfig' => ['authStack'],
    ];

    /** Internals the HTTP layer and serializer call; never authoring surface. */
    private const INTERNAL_EXACT = [
        'jsonSerialize', 'toNode', 'toArray', 'toWire', '__call', '__construct',
        'make', 'configure', 'view', 'path', 'slug', 'title', 'subtitle',
        'headerActions', 'breadcrumbs', 'layout', 'nav', 'can', 'middleware',
        'reorderColumn', 'handler', 'skipsFormValidation', 'submitHandler',
        'appearance', 'header', 'sidebar', 'footer', 'displayLabel',
        'toDatabaseNotification', 'builtInKindClasses', 'cascadeTranslatable',
        'makeField', 'sortByField',
    ];

    /**
     * Internals whose names collide with authoring methods elsewhere
     * (NavGroup::key/meta vs Field::meta, NavItem::label vs Field::label).
     *
     * @var array<class-string, list<string>>
     */
    private const INTERNAL_PER_CLASS = [
        'Tbtop\Admin\Navigation\NavGroup' => ['key', 'meta'],
        'Tbtop\Admin\Navigation\NavItem' => ['label'],
    ];

    private const INTERNAL_PREFIXES = ['get', 'is', 'has', 'collect', 'reachable', 'find', 'normalize', 'assert', 'seed', 'render', 'apply', 'from', 'default'];

    private const INTERNAL_SUFFIXES = ['Closure', 'Resolver', 'Spec', 'Fields', 'Columns', 'Names', 'Objects', 'Data', 'Entries', 'With', 'Text', 'Stack'];

    /**
     * @return array{authoring: list<ReflectionMethod>, internal: list<ReflectionMethod>, unclassified: list<ReflectionMethod>}
     */
    public function classify(string $class): array
    {
        $result = ['authoring' => [], 'internal' => [], 'unclassified' => []];

        foreach ($this->publicMethods($class) as $method) {
            $result[$this->bucketFor($class, $method)][] = $method;
        }

        return $result;
    }

    /** @return list<ReflectionMethod> */
    private function publicMethods(string $class): array
    {
        $reflection = new \ReflectionClass($class);
        $methods = [];

        foreach ($reflection->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
            if ($method->isStatic() && $method->getName() === 'make') {
                continue;
            }
            if ($this->isInherited($method, $reflection)) {
                continue;
            }
            $methods[] = $method;
        }

        usort($methods, fn ($a, $b) => strcmp($a->getName(), $b->getName()));

        return $methods;
    }

    /** Trait methods count as declared here; methods from a parent class do not. */
    private function isInherited(ReflectionMethod $method, \ReflectionClass $reflection): bool
    {
        if ($method->getDeclaringClass()->getName() === $reflection->getName()) {
            return false;
        }

        foreach ($reflection->getTraits() as $trait) {
            if ($trait->hasMethod($method->getName())) {
                return false;
            }
        }

        return true;
    }

    private function bucketFor(string $class, ReflectionMethod $method): string
    {
        $name = $method->getName();

        if (in_array($name, self::AUTHORING_EXCEPTIONS[$class] ?? [], true)) {
            return 'authoring';
        }
        if (in_array($name, self::INTERNAL_PER_CLASS[$class] ?? [], true)) {
            return 'internal';
        }
        if ($this->isFluent($method)) {
            return 'authoring';
        }
        if ($this->matchesInternalPattern($name)) {
            return 'internal';
        }

        return 'unclassified';
    }

    private function isFluent(ReflectionMethod $method): bool
    {
        $type = $method->getReturnType();

        return $type instanceof ReflectionNamedType
            && in_array($type->getName(), ['self', 'static'], true);
    }

    private function matchesInternalPattern(string $name): bool
    {
        if (in_array($name, self::INTERNAL_EXACT, true)) {
            return true;
        }
        foreach (self::INTERNAL_PREFIXES as $prefix) {
            if (str_starts_with($name, $prefix) && $name !== $prefix) {
                return true;
            }
        }
        foreach (self::INTERNAL_SUFFIXES as $suffix) {
            if (str_ends_with($name, $suffix)) {
                return true;
            }
        }

        return false;
    }
}
