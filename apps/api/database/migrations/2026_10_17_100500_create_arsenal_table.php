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
        Schema::create('arsenal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category');
            $table->enum('type', ['daily', 'weekly', 'specific_days', 'interval', 'measurable', 'yes_no']);
            $table->json('frequency');
            $table->integer('target_value')->nullable();
            $table->string('unit')->nullable();
            $table->time('reminder_time')->nullable();
            $table->integer('current_streak')->default(0);
            $table->integer('best_streak')->default(0);
            $table->boolean('active')->default(true);
            $table->json('mode_specific')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('arsenal');
    }
};
