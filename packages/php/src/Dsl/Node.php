<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use stdClass;

final class Node implements JsonSerializable
{
    /**
     * @param  array<string, mixed>  $options
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        public readonly string $kind,
        public readonly array $options = [],
        public readonly ?string $name = null,
        public readonly array $meta = [],
    ) {}

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        $out = [
            'kind' => $this->kind,
            'options' => $this->options === [] ? new stdClass : $this->options,
            'meta' => $this->meta === [] ? new stdClass : $this->meta,
        ];
        if ($this->name !== null) {
            $out['name'] = $this->name;
        }

        return $out;
    }
}
