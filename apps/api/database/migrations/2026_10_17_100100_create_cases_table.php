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
        Schema::create('cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('status', ['planning', 'active', 'on_hold', 'completed', 'archived'])->default('planning');
            $table->string('category')->nullable();
            $table->date('start_date');
            $table->date('target_end_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->integer('progress')->default(0);
            $table->enum('progress_mode', ['manual', 'auto'])->default('auto');
            $table->string('color')->nullable();
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cases');
    }
};
