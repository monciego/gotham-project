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
        Schema::create('intel', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->text('content');
            $table->enum('mood', ['great', 'good', 'okay', 'bad', 'terrible']);
            $table->integer('energy_level');
            $table->integer('stress_level');
            $table->text('gratitude')->nullable();
            $table->json('wins')->nullable();
            $table->json('struggles')->nullable();
            $table->json('tags')->nullable();
            $table->decimal('sentiment', 3, 2)->nullable();
            $table->enum('sentiment_label', ['positive', 'neutral', 'negative'])->nullable();
            $table->timestamps();

            $table->index(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('intel');
    }
};
