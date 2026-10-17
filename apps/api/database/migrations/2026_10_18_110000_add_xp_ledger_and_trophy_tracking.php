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
        // Every XP change, so the history can be shown and levels traced (App\Services\Xp).
        Schema::create('xp_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Negative when an undo takes XP back.
            $table->integer('amount');
            // A key such as mission_complete or trophy.
            $table->string('reason');
            // What it was for, e.g. the mission's title.
            $table->string('label')->nullable();
            $table->integer('total_after');
            $table->integer('level_before');
            $table->integer('level_after');
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'created_at']);
        });

        // Days the user opened the app, for the login streak.
        Schema::create('user_activity_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');

            $table->unique(['user_id', 'date']);
        });

        // Each time a mission's due date was pushed later.
        Schema::create('mission_postponements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mission_id')->constrained()->cascadeOnDelete();
            $table->date('from_date');
            $table->date('to_date');
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'created_at']);
        });

        Schema::table('alfred_messages', function (Blueprint $table) {
            $table->timestamp('acted_at')->nullable()->after('action_taken');
        });

        Schema::table('achievements', function (Blueprint $table) {
            // A Lucide icon name; the web maps it to the component.
            $table->string('icon')->default('trophy')->after('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('achievements', fn (Blueprint $table) => $table->dropColumn('icon'));
        Schema::table('alfred_messages', fn (Blueprint $table) => $table->dropColumn('acted_at'));
        Schema::dropIfExists('mission_postponements');
        Schema::dropIfExists('user_activity_days');
        Schema::dropIfExists('xp_events');
    }
};
