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
        Schema::create('system_intelligence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('pattern_type');
            $table->json('pattern_data');
            $table->decimal('confidence', 3, 2);
            $table->timestamp('discovered_at')->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->index(['user_id', 'pattern_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_intelligence');
    }
};
