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
        Schema::create('savings_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->decimal('target_amount', 12, 2);
            // The sum of the transactions linked to the goal, kept up to date by the API.
            $table->decimal('current_amount', 12, 2)->default(0);
            $table->date('deadline')->nullable();
            $table->boolean('completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::table('resources', function (Blueprint $table) {
            // Copies made by the recurring job point at the transaction they repeat.
            $table->foreignId('recurring_source_id')->nullable()->after('recurring_frequency')->constrained('resources')->nullOnDelete();
            $table->foreignId('savings_goal_id')->nullable()->after('recurring_source_id')->constrained('savings_goals')->nullOnDelete();
            $table->index(['user_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'category']);
            $table->dropConstrainedForeignId('savings_goal_id');
            $table->dropConstrainedForeignId('recurring_source_id');
        });

        Schema::dropIfExists('savings_goals');
    }
};
