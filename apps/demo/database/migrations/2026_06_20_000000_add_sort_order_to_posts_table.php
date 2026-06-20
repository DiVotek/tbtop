<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->index();
        });

        // Seed a stable starting order so drag-reorder has something to move.
        DB::table('posts')->orderBy('id')->get(['id'])->each(function ($row, $index): void {
            DB::table('posts')->where('id', $row->id)->update(['sort_order' => $index]);
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex(['sort_order']);
            $table->dropColumn('sort_order');
        });
    }
};
