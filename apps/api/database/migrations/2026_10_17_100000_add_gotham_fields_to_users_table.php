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
        Schema::table('users', function (Blueprint $table) {
            $table->string('timezone')->default('UTC');
            $table->string('avatar')->nullable();
            $table->enum('current_mode', ['batman', 'wayne', 'bruce', 'playboy', 'rest'])->default('bruce');
            $table->integer('total_xp')->default(0);
            $table->integer('current_level')->default(1);
            $table->json('notification_preferences')->nullable();
            $table->time('work_start_time')->nullable();
            $table->time('work_end_time')->nullable();
            $table->enum('alfred_aggressiveness', ['mild', 'normal', 'intense'])->default('normal');
            $table->boolean('onboarding_completed')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'timezone',
                'avatar',
                'current_mode',
                'total_xp',
                'current_level',
                'notification_preferences',
                'work_start_time',
                'work_end_time',
                'alfred_aggressiveness',
                'onboarding_completed',
            ]);
        });
    }
};
