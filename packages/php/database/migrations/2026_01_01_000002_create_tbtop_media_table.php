<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotent: table may already exist via published copy of this migration.
        if (Schema::hasTable('tbtop_media')) {
            return;
        }

        Schema::create('tbtop_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folder_id')->nullable()->constrained('tbtop_media_folders')->nullOnDelete();
            $table->string('name');
            $table->string('disk');
            $table->string('path');
            $table->string('mime', 100);
            $table->unsignedBigInteger('size');
            $table->json('sizes')->nullable();
            $table->string('alt')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tbtop_media');
    }
};
