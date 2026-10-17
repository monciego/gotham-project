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
        Schema::create('focus_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mission_id')->nullable()->constrained('missions')->nullOnDelete();
            $table->dateTime('start_time');
            $table->dateTime('end_time')->nullable();
            $table->integer('duration_minutes')->default(25);
            $table->boolean('completed')->default(false);
            $table->integer('energy_before')->nullable();
            $table->integer('energy_after')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'start_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('focus_sessions');
    }
};
