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
        Schema::create('alfred_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('mood', ['concerned', 'proud', 'disappointed', 'encouraging']);
            $table->string('title');
            $table->text('message');
            $table->json('actions')->nullable();
            $table->boolean('requires_action')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('dismissed_at')->nullable();
            $table->boolean('action_taken')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alfred_messages');
    }
};
