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
        Schema::create('resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['income', 'expense']);
            $table->decimal('amount', 10, 2);
            $table->string('category');
            $table->string('description')->nullable();
            $table->date('date');
            $table->string('account')->nullable();
            $table->boolean('recurring')->default(false);
            $table->enum('recurring_frequency', ['daily', 'weekly', 'monthly', 'yearly'])->nullable();
            $table->timestamps();

            $table->index(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resources');
    }
};
