<?php

namespace Tbtop\Admin\Support\ApiReference;

use ReflectionIntersectionType;
use ReflectionMethod;
use ReflectionNamedType;
use ReflectionParameter;
use ReflectionUnionType;

/** @internal Renders a reflected method into signature + prose for the API reference. */
final class MethodReader
{
    public function read(ReflectionMethod $method): MethodInfo
    {
        return new MethodInfo(
            name: $method->getName(),
            signature: $this->signature($method),
            description: $this->description($method),
            declaredIn: $this->declaringName($method),
        );
    }

    private function signature(ReflectionMethod $method): string
    {
        $params = array_map($this->parameter(...), $method->getParameters());
        $return = $method->getReturnType();

        return $method->getName().'('.implode(', ', $params).')'
            .($return ? ': '.$this->typeName($return) : '');
    }

    private function parameter(ReflectionParameter $param): string
    {
        $type = $param->getType();
        $rendered = ($type ? $this->typeName($type).' ' : '')
            .($param->isVariadic() ? '...' : '').'$'.$param->getName();

        if (! $param->isDefaultValueAvailable()) {
            return $rendered;
        }

        return $rendered.' = '.$this->defaultValue($param);
    }

    private function defaultValue(ReflectionParameter $param): string
    {
        $value = $param->getDefaultValue();

        return match (true) {
            $value === null => 'null',
            is_bool($value) => $value ? 'true' : 'false',
            is_string($value) => "'".$value."'",
            is_array($value) => $this->arrayLiteral($value),
            default => (string) $value,
        };
    }

    /** @param  array<mixed>  $value */
    private function arrayLiteral(array $value): string
    {
        if ($value === []) {
            return '[]';
        }

        $parts = array_map(
            fn ($item) => is_string($item) ? "'".$item."'" : (string) $item,
            $value,
        );

        return '['.implode(', ', $parts).']';
    }

    private function typeName(\ReflectionType $type): string
    {
        if ($type instanceof ReflectionUnionType) {
            return implode('|', array_map($this->typeName(...), $type->getTypes()));
        }
        if ($type instanceof ReflectionIntersectionType) {
            return implode('&', array_map($this->typeName(...), $type->getTypes()));
        }
        if (! $type instanceof ReflectionNamedType) {
            return 'mixed';
        }

        $name = $type->getName();
        $short = str_contains($name, '\\') ? substr((string) strrchr($name, '\\'), 1) : $name;

        return ($type->allowsNull() && $short !== 'mixed' && $short !== 'null' ? '?' : '').$short;
    }

    /** Strips the comment syntax and drops annotation-only lines, keeping the prose. */
    private function description(ReflectionMethod $method): string
    {
        $doc = $method->getDocComment();

        if ($doc === false) {
            return '';
        }

        $lines = [];
        foreach (explode("\n", $doc) as $line) {
            $line = trim(preg_replace('#^\s*(/\*\*|\*/|\*)\s?#', '', $line) ?? '');
            $line = trim(preg_replace('#\s*\*/\s*$#', '', $line) ?? '');
            $line = preg_replace('/\s{2,}/', ' ', $line) ?? $line;

            // Annotations end the prose — the signature already carries the
            // types. Pint collapses short docblocks onto one line, so a tag can
            // appear mid-line rather than starting one.
            if (preg_match('/(^|\s)@\w+/', $line, $m, PREG_OFFSET_CAPTURE) === 1) {
                $line = trim(substr($line, 0, $m[0][1]));
                if ($line !== '') {
                    $lines[] = $line;
                }

                break;
            }
            if ($line === '') {
                continue;
            }
            $lines[] = $line;
        }

        return trim(implode(' ', $lines));
    }

    private function declaringName(ReflectionMethod $method): string
    {
        $name = $method->getDeclaringClass()->getName();

        return str_contains($name, '\\') ? substr((string) strrchr($name, '\\'), 1) : $name;
    }
}
