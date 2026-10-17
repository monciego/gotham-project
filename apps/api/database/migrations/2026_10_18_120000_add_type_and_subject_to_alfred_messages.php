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
        Schema::table('alfred_messages', function (Blueprint $table) {
            // An App\Services\AlfredService type (no_start, task_avoidance, …); null for older free-form messages.
            $table->string('type')->nullable()->after('user_id');
            // What it is about (a mission or habit id), so Alfred says it once a day per subject.
            $table->unsignedBigInteger('subject_id')->nullable()->after('type');

            $table->index(['user_id', 'type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('alfred_messages', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'type', 'created_at']);
            $table->dropColumn(['type', 'subject_id']);
        });
    }
};
