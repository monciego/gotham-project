<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('arsenal', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('arsenal_logs', function (Blueprint $table) {
            $table->integer('xp_awarded')->default(0)->after('note');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('arsenal', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('arsenal_logs', function (Blueprint $table) {
            $table->dropColumn('xp_awarded');
        });
    }
};
