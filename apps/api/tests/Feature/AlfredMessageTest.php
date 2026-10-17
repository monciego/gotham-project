<?php

namespace Tests\Feature;

use App\Models\AlfredMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlfredMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_unread_messages_critical_first_with_a_count(): void
    {
        $user = User::factory()->create();
        AlfredMessage::factory()->for($user)->create(['priority' => 'low']);
        AlfredMessage::factory()->for($user)->create(['priority' => 'critical', 'title' => 'Critical']);
        AlfredMessage::factory()->for($user)->create(['dismissed_at' => now()]);
        AlfredMessage::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/v1/alfred-messages')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 2)
            ->assertJsonPath('data.messages.0.title', 'Critical');
    }

    public function test_dismissing_marks_the_message_read_and_dismissed(): void
    {
        $message = AlfredMessage::factory()->create();

        $this->actingAs($message->user, 'sanctum')
            ->postJson("/api/v1/alfred-messages/{$message->id}/dismiss")
            ->assertOk();

        $message->refresh();
        $this->assertNotNull($message->dismissed_at);
        $this->assertNotNull($message->read_at);
        $this->assertFalse($message->action_taken);
    }

    public function test_acting_records_the_action(): void
    {
        $message = AlfredMessage::factory()->create(['requires_action' => true]);

        $this->actingAs($message->user, 'sanctum')
            ->postJson("/api/v1/alfred-messages/{$message->id}/act")
            ->assertOk();

        $this->assertTrue($message->refresh()->action_taken);
    }

    public function test_other_users_messages_are_not_found(): void
    {
        $message = AlfredMessage::factory()->create();

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson("/api/v1/alfred-messages/{$message->id}/dismiss")
            ->assertNotFound();
    }
}
