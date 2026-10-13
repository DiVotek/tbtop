<?php

namespace Tbtop\Admin\Commands\Resource;

/**
 * The make:tbtop-resource flags that shape the generated code.
 *
 * @internal
 */
final class ResourceOptions
{
    public function __construct(
        public readonly bool $simple,
        public readonly bool $view,
        public readonly bool $softDeletes,
        public readonly bool $policy,
        public readonly ?string $navGroup,
    ) {}
}
