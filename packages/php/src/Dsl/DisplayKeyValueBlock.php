<?php

namespace Tbtop\Admin\Dsl;

use JsonSerializable;
use stdClass;

/**
 * Read-only <dl> map render of key/value pairs.
 *
 * Richer than the comma-joined keyvalue cell preview — each pair renders as a
 * <dt>/<dd> row. The author passes the map directly.
 *
 * @method static self make(array $map)
 */
final class DisplayKeyValueBlock implements JsonSerializable
{
    /** @param  array<string, mixed>  $map */
    private function __construct(private readonly array $map) {}

    /** @param  array<string, mixed>  $map */
    public static function make(array $map): self
    {
        return new self($map);
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return [
            'kind' => 'displayKeyValue',
            'options' => ['entries' => $this->mapForWire()],
            'meta' => new stdClass,
        ];
    }

    /**
     * Force an object on the wire even when empty so options.entries is `{}`,
     * not `[]` (an empty PHP array serializes as a JSON array otherwise).
     */
    private function mapForWire(): object|array
    {
        return $this->map === [] ? new stdClass : $this->map;
    }
}
