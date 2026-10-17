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
        Schema::table('cases', function (Blueprint $table) {
            $table->integer('xp_awarded')->default(0)->after('notes');
            // The highest of 25/50/75/100 Alfred has already celebrated, so a case is celebrated once per mark.
            $table->integer('progress_milestone')->default(0)->after('progress');
        });

        // One snapshot per case per day, the last progress of that day.
        Schema::create('case_progress_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->date('date');
            $table->integer('progress');
            $table->timestamps();

            $table->unique(['case_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('case_progress_logs');

        Schema::table('cases', function (Blueprint $table) {
            $table->dropColumn(['xp_awarded', 'progress_milestone']);
        });
    }
};
