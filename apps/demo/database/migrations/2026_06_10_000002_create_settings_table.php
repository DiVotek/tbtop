<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('site_name')->default('Tabletop Demo');
            $table->string('tagline')->nullable();
            $table->boolean('maintenance_mode')->default(false);
            $table->unsignedInteger('max_upload_mb')->default(10);
            $table->dateTime('launch_date')->nullable();
            $table->json('theme')->default('{"primary":"#3b82f6","accent":"#f59e0b"}');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
