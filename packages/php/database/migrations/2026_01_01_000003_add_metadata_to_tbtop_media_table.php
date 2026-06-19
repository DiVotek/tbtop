<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tbtop_media', function (Blueprint $table) {
            if (! Schema::hasColumn('tbtop_media', 'description')) {
                $table->text('description')->nullable()->after('alt');
            }
            if (! Schema::hasColumn('tbtop_media', 'tags')) {
                $table->json('tags')->nullable()->after('description');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tbtop_media', function (Blueprint $table) {
            if (Schema::hasColumn('tbtop_media', 'tags')) {
                $table->dropColumn('tags');
            }
            if (Schema::hasColumn('tbtop_media', 'description')) {
                $table->dropColumn('description');
            }
        });
    }
};
