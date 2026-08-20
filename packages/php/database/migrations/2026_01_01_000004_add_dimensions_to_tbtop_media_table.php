<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbtop_media', function (Blueprint $table) {
            if (! Schema::hasColumn('tbtop_media', 'width')) {
                $table->unsignedInteger('width')->nullable()->after('size');
            }
            if (! Schema::hasColumn('tbtop_media', 'height')) {
                $table->unsignedInteger('height')->nullable()->after('width');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tbtop_media', function (Blueprint $table) {
            if (Schema::hasColumn('tbtop_media', 'height')) {
                $table->dropColumn('height');
            }
            if (Schema::hasColumn('tbtop_media', 'width')) {
                $table->dropColumn('width');
            }
        });
    }
};
