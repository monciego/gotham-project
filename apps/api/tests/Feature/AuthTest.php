<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'password';

    public function test_register_creates_user_and_returns_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Bruce Wayne',
            'email' => 'bruce@wayne.test',
            'password' => 'iamthenight',
            'password_confirmation' => 'iamthenight',
            'timezone' => 'America/New_York',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'bruce@wayne.test')
            ->assertJsonPath('data.user.timezone', 'America/New_York')
            ->assertJsonPath('data.user.current_mode', 'bruce');

        $this->withToken($response->json('data.token'))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.name', 'Bruce Wayne');
    }

    public function test_register_returns_validation_errors_in_envelope(): void
    {
        User::factory()->create(['email' => 'bruce@wayne.test']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Bruce Wayne',
            'email' => 'bruce@wayne.test',
            'password' => 'short',
            'password_confirmation' => 'different',
            'timezone' => 'Gotham/Narrows',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('data', null)
            ->assertJsonValidationErrors(['email', 'password', 'timezone']);
    }

    public function test_login_with_wrong_password_fails(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_issues_named_token_with_expiry(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => self::PASSWORD,
            'remember' => true,
        ])->assertOk()->assertJsonStructure(['data' => ['user' => ['id', 'email'], 'token']]);

        $token = $user->tokens()->sole();
        $this->assertSame('gotham-web', $token->name);
        $this->assertTrue($token->expires_at->isAfter(now()->addDays(29)));
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('gotham-web')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_protected_routes_require_a_token(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized()
            ->assertExactJson(['success' => false, 'message' => 'Unauthenticated.', 'data' => null, 'errors' => null]);
    }

    public function test_update_profile_replaces_avatar(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['avatar' => 'avatars/old.jpg']);
        Storage::disk('public')->put('avatars/old.jpg', 'old');

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/auth/profile', [
            'name' => 'Matches Malone',
            'timezone' => 'Europe/London',
            'avatar' => UploadedFile::fake()->create('avatar.jpg', 100, 'image/jpeg'),
        ]);

        $response->assertOk()->assertJsonPath('data.name', 'Matches Malone');

        $user->refresh();
        $this->assertSame('Europe/London', $user->timezone);
        Storage::disk('public')->assertExists($user->avatar);
        Storage::disk('public')->assertMissing('avatars/old.jpg');
        $this->assertStringEndsWith($user->avatar, $response->json('data.avatar_url'));
    }

    public function test_changing_email_clears_verification(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/auth/profile', ['email' => 'batman@cave.test'])
            ->assertOk();

        $this->assertNull($user->refresh()->email_verified_at);
    }

    public function test_update_password_checks_current_and_signs_out_other_devices(): void
    {
        $user = User::factory()->create();
        $current = $user->createToken('gotham-web')->plainTextToken;
        $user->createToken('gotham-web');

        $this->withToken($current)->putJson('/api/v1/auth/password', [
            'current_password' => 'wrong',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertJsonValidationErrors(['current_password']);

        $this->withToken($current)->putJson('/api/v1/auth/password', [
            'current_password' => self::PASSWORD,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertSame(1, $user->tokens()->count());
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'new-password'])->assertOk();
    }

    public function test_delete_account_requires_password_and_removes_all_data(): void
    {
        $user = User::factory()->create();
        $user->missions()->create(['title' => 'Stop Joker', 'why_it_matters' => 'Gotham', 'due_date' => now()]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/auth/account', ['password' => 'wrong'])
            ->assertJsonValidationErrors(['password']);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/auth/account', ['password' => self::PASSWORD])
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseCount('missions', 0);
    }

    public function test_password_can_be_reset_through_the_frontend_link(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@gotham.test'])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user) {
            $url = $notification->toMail($user)->actionUrl;
            $this->assertStringStartsWith(config('app.frontend_url').'/reset-password?token=', $url);

            $this->postJson('/api/v1/auth/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'brand-new-password',
                'password_confirmation' => 'brand-new-password',
            ])->assertOk();

            return true;
        });

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'brand-new-password'])->assertOk();
    }
}
