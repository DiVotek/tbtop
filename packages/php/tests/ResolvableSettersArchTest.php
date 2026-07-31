<?php

use Tbtop\Admin\Dsl\Fields\Field;

/**
 * Guards RESOLVABLE against drifting from the setters it names: every key in
 * a builder's RESOLVABLE list must have a same-named public setter whose
 * signature accepts Closure, so the "declared resolvable" list can never lie
 * about what's actually deferrable.
 */
it('every RESOLVABLE key has a public setter accepting Closure', function (): void {
    $offenders = [];

    foreach (resolvableDeclaringClasses() as $class) {
        $reflection = new ReflectionClass($class);
        /** @var list<string> $keys */
        $keys = $reflection->getConstant('RESOLVABLE');

        foreach ($keys as $key) {
            if (! setterAcceptsClosure($reflection, $key)) {
                $offenders[] = "{$class}::{$key}";
            }
        }
    }

    expect($offenders)->toBe([]);
});

function resolvableDeclaringClasses(): Generator
{
    $srcDir = dirname(__DIR__).'/src';
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($srcDir));

    foreach ($files as $file) {
        if (! $file->isFile() || $file->getExtension() !== 'php') {
            continue;
        }

        $class = classFromFile($srcDir, $file->getPathname());
        if ($class === null || ! class_exists($class)) {
            continue;
        }

        $reflection = new ReflectionClass($class);
        if ($reflection->isAbstract() || ! $reflection->hasConstant('RESOLVABLE')) {
            continue;
        }
        if ($reflection->getConstant('RESOLVABLE') !== []) {
            yield $class;
        }
    }
}

function classFromFile(string $srcDir, string $path): ?string
{
    if (! str_starts_with($path, $srcDir)) {
        return null;
    }

    $relative = substr($path, strlen($srcDir) + 1, -4);

    return 'Tbtop\\Admin\\'.str_replace('/', '\\', $relative);
}

function setterAcceptsClosure(ReflectionClass $reflection, string $key): bool
{
    if (! $reflection->hasMethod($key)) {
        return false;
    }

    $method = $reflection->getMethod($key);
    if (! $method->isPublic()) {
        return false;
    }

    foreach ($method->getParameters() as $parameter) {
        if (parameterAcceptsClosure($parameter)) {
            return true;
        }
    }

    return false;
}

function parameterAcceptsClosure(ReflectionParameter $parameter): bool
{
    $type = $parameter->getType();

    if ($type instanceof ReflectionNamedType && $type->getName() === 'mixed') {
        return true;
    }

    if (! $type instanceof ReflectionUnionType) {
        return false;
    }

    foreach ($type->getTypes() as $branch) {
        if ($branch instanceof ReflectionNamedType && $branch->getName() === Closure::class) {
            return true;
        }
    }

    return false;
}

it('Field::RESOLVABLE is exactly the keys this slice fixes', function (): void {
    $reflection = new ReflectionClass(Field::class);

    expect($reflection->hasConstant('RESOLVABLE'))->toBeTrue()
        ->and($reflection->getConstant('RESOLVABLE'))->toBe(['label', 'default', 'helperText', 'tooltip']);
});
