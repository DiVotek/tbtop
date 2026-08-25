<?php

namespace Tbtop\Admin\Support\ApiReference;

/** @internal Built only by the API-reference generator. */
final readonly class MethodInfo
{
    public function __construct(
        public string $name,
        public string $signature,
        public string $description,
        /** Declaring class, or the trait name when the method comes from one. */
        public string $declaredIn,
    ) {}

    public function isDocumented(): bool
    {
        return $this->description !== '';
    }
}
