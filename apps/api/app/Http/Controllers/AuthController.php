<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\DeleteAccountRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const TOKEN_NAME = 'gotham-web';

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->safe()->only(['name', 'email', 'password', 'timezone']));

        event(new Registered($user));

        return $this->success([
            'user' => new UserResource($user->refresh()),
            'token' => $this->issueToken($user, remember: false),
        ], 'Registered.', 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->string('email')->lower())->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        return $this->success([
            'user' => new UserResource($user),
            'token' => $this->issueToken($user, $request->boolean('remember')),
        ], 'Logged in.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(message: 'Logged out.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success(new UserResource($request->user()));
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->safe()->except('avatar');
        $oldAvatar = $user->avatar;

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        } elseif ($request->exists('avatar') && $request->input('avatar') === null) {
            $data['avatar'] = null;
        }

        $user->fill($data);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($oldAvatar && $user->wasChanged('avatar')) {
            Storage::disk('public')->delete($oldAvatar);
        }

        return $this->success(new UserResource($user), 'Profile updated.');
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update(['password' => $request->validated('password')]);

        // Sign out every other device; keep the session that made the change.
        $user->tokens()->whereKeyNot($user->currentAccessToken()->getKey())->delete();

        return $this->success(message: 'Password updated.');
    }

    public function deleteAccount(DeleteAccountRequest $request): JsonResponse
    {
        $user = $request->user();
        $avatar = $user->avatar;

        // Hard delete. Every Gotham table cascades on users.id; tokens are polymorphic, so they go first.
        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            $user->delete();
        });

        if ($avatar) {
            Storage::disk('public')->delete($avatar);
        }

        return $this->success(message: 'Account deleted.');
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->only('email'));

        // Same answer whether or not the email exists, so accounts can't be discovered.
        return $this->success(message: 'If that email is registered, a reset link is on its way.');
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        return $this->success(message: __($status));
    }

    private function issueToken(User $user, bool $remember): string
    {
        $expiresAt = $remember ? now()->addDays(30) : now()->addDay();

        return $user->createToken(self::TOKEN_NAME, ['*'], $expiresAt)->plainTextToken;
    }
}
