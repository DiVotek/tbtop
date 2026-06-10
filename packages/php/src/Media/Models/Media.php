<?php

namespace Tbtop\Admin\Media\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $folder_id
 * @property string $name
 * @property string $disk
 * @property string $path
 * @property string $mime
 * @property int $size
 * @property array<string, string>|null $sizes
 * @property string|null $alt
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Media extends Model
{
    protected $table = 'tbtop_media';

    protected $guarded = [];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'size' => 'integer',
            'sizes' => 'array',
        ];
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(MediaFolder::class, 'folder_id');
    }
}
