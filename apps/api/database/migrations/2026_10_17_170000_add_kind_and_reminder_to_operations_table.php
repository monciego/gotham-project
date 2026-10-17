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
        Schema::table('operations', function (Blueprint $table) {
            // event or focus_block.
            $table->string('kind')->default('event')->after('mission_id');
            $table->unsignedInteger('reminder_minutes')->nullable()->after('recurring_rule');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('operations', function (Blueprint $table) {
            $table->dropColumn(['kind', 'reminder_minutes']);
        });
    }
};
