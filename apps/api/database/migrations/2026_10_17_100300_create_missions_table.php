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
        Schema::create('missions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('case_id')->nullable()->constrained('cases')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('why_it_matters');
            $table->enum('priority', ['critical', 'high', 'medium', 'low'])->default('medium');
            $table->enum('status', ['not_started', 'in_progress', 'completed', 'abandoned'])->default('not_started');
            $table->date('due_date');
            $table->time('due_time')->nullable();
            $table->integer('estimated_minutes')->nullable();
            $table->integer('actual_minutes')->default(0);
            $table->integer('times_postponed')->default(0);
            $table->enum('energy_required', ['high', 'medium', 'low'])->default('medium');
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            $table->text('past_self_message')->nullable();
            $table->timestamps();
            $table->timestamp('completed_at')->nullable();
            $table->softDeletes();

            $table->index(['user_id', 'status', 'due_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('missions');
    }
};
