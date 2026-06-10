<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->json('title');
            $table->json('intro')->nullable();
            $table->string('slug')->unique();
            $table->json('body')->nullable();
            $table->boolean('published')->default(false);
            $table->dateTime('published_at')->nullable();
            $table->unsignedInteger('views')->default(0);
            $table->float('rating')->nullable();
            $table->json('metadata')->default('{}');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('sections')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
