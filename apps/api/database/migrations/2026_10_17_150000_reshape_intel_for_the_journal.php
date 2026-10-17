<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Wins and struggles become free text, sentiment scores keep four decimals
 * (the labels turn at ±0.02), entries remember their XP, and there's one
 * entry per day. Intel had no way to write entries before this, so the
 * dropped columns hold nothing.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('intel', function (Blueprint $table) {
            $table->dropColumn(['wins', 'struggles']);
        });

        Schema::table('intel', function (Blueprint $table) {
            $table->text('wins')->nullable()->after('gratitude');
            $table->text('struggles')->nullable()->after('wins');
            $table->decimal('sentiment', 5, 4)->nullable()->change();
            $table->integer('xp_awarded')->default(0)->after('sentiment_label');
            $table->dropIndex(['user_id', 'date']);
            $table->unique(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('intel', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'date']);
            $table->index(['user_id', 'date']);
            $table->dropColumn(['wins', 'struggles', 'xp_awarded']);
            $table->decimal('sentiment', 3, 2)->nullable()->change();
        });

        Schema::table('intel', function (Blueprint $table) {
            $table->json('wins')->nullable();
            $table->json('struggles')->nullable();
        });
    }
};
