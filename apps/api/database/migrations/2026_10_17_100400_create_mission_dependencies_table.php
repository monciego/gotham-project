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
        Schema::create('mission_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_id')->constrained('missions')->cascadeOnDelete();
            $table->foreignId('depends_on_mission_id')->constrained('missions')->cascadeOnDelete();

            $table->unique(['mission_id', 'depends_on_mission_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mission_dependencies');
    }
};
