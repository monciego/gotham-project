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
        Schema::create('arsenal_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('arsenal_id')->constrained('arsenal')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->boolean('completed')->default(false);
            $table->integer('value')->nullable();
            $table->boolean('skipped')->default(false);
            $table->text('note')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // One check-in per habit per day.
            $table->unique(['arsenal_id', 'date']);
            $table->index(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('arsenal_logs');
    }
};
