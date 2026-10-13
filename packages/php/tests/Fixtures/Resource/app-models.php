<?php

// Host-side models for make:tbtop-resource tests. They live in App\Models, where
// the generator guesses related models, so they are required, not autoloaded.

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tbtop\Admin\Tests\Fixtures\Resource\ArticleStatus;

class Writer extends Model
{
    protected $guarded = [];

    protected $hidden = ['api_token'];
}

class Article extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'published' => 'boolean',
            'published_at' => 'datetime',
            'status' => ArticleStatus::class,
            'meta' => 'array',
        ];
    }

    public function writer(): BelongsTo
    {
        return $this->belongsTo(Writer::class);
    }
}

/** Mimics spatie HasTranslations' two methods the generator reads. */
class Note extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = ['title' => 'array'];

    /** @return list<string> */
    public function getTranslatableAttributes(): array
    {
        return ['title'];
    }

    /** @return array<string, array<string, string>> */
    public function getTranslations(): array
    {
        return ['title' => (array) $this->title];
    }
}

function createResourceTables(): void
{
    Schema::create('writers', function (Blueprint $table): void {
        $table->id();
        $table->string('name');
        $table->string('email')->nullable()->unique();
        $table->string('api_token')->nullable();
        $table->timestamps();
    });
    Schema::create('articles', function (Blueprint $table): void {
        $table->id();
        $table->string('title', 120);
        $table->string('slug')->unique();
        $table->text('body')->nullable();
        $table->boolean('published')->default(false);
        $table->dateTime('published_at')->nullable();
        $table->integer('views')->default(0);
        $table->decimal('price', 8, 2)->nullable();
        $table->string('status');
        $table->foreignId('writer_id')->nullable()->constrained();
        $table->json('meta')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('notes', function (Blueprint $table): void {
        $table->id();
        $table->json('title');
        $table->string('password');
        $table->json('settings')->nullable();
        $table->binary('blob');
    });
}
