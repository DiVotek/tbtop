<?php

namespace Tbtop\Admin\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;

/**
 * Mimics Spatie HasTranslations WITHOUT depending on the package, reproducing
 * the two behaviors that break ColumnProjection:
 *   - getAttributeValue() pre-flattens a translatable attribute to one locale,
 *     so data_get() returns a string, not the map (read-side no-op).
 *   - attributesToArray() re-expands it back to the full locale map, so the
 *     model's toArray() always re-emits the map (serialize-side [object Object]).
 * getRawOriginal() still returns the stored JSON map — the fix reads that.
 */
class FakeTranslatablePost extends Model
{
    protected $table = 'ftposts';

    public $timestamps = false;

    protected $fillable = ['name', 'views'];

    protected $casts = ['views' => 'integer'];

    /** @var list<string> columns stored as a JSON locale map */
    private array $translatableKeys = ['name'];

    private string $fakeLocale = 'en';

    public function getAttributeValue($key): mixed
    {
        if (! in_array($key, $this->translatableKeys, true)) {
            return parent::getAttributeValue($key);
        }
        $map = $this->decodeMap($this->getRawOriginal($key));

        return $map[$this->fakeLocale] ?? (reset($map) ?: null);
    }

    /** @return array<string, mixed> */
    public function attributesToArray(): array
    {
        $array = parent::attributesToArray();
        foreach ($this->translatableKeys as $key) {
            if (array_key_exists($key, $array)) {
                $array[$key] = $this->decodeMap($this->getRawOriginal($key));
            }
        }

        return $array;
    }

    /** @return array<string, mixed> */
    private function decodeMap(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }
        $decoded = is_string($raw) ? json_decode($raw, true) : null;

        return is_array($decoded) ? $decoded : [];
    }
}
