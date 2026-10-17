<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'password',
    'timezone',
    'avatar',
    'current_mode',
    'notification_preferences',
    'work_start_time',
    'work_end_time',
    'alfred_aggressiveness',
    'onboarding_completed',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'total_xp' => 'integer',
            'current_level' => 'integer',
            'notification_preferences' => 'array',
            'onboarding_completed' => 'boolean',
        ];
    }

    public function missions(): HasMany
    {
        return $this->hasMany(Mission::class);
    }

    public function cases(): HasMany
    {
        return $this->hasMany(CaseFile::class);
    }

    public function arsenal(): HasMany
    {
        return $this->hasMany(Arsenal::class);
    }

    public function arsenalLogs(): HasMany
    {
        return $this->hasMany(ArsenalLog::class);
    }

    public function intel(): HasMany
    {
        return $this->hasMany(Intel::class);
    }

    public function resources(): HasMany
    {
        return $this->hasMany(Resource::class);
    }

    public function budgets(): HasMany
    {
        return $this->hasMany(Budget::class);
    }

    public function operations(): HasMany
    {
        return $this->hasMany(Operation::class);
    }

    public function focusSessions(): HasMany
    {
        return $this->hasMany(FocusSession::class);
    }

    public function alfredMessages(): HasMany
    {
        return $this->hasMany(AlfredMessage::class);
    }

    public function achievements(): BelongsToMany
    {
        return $this->belongsToMany(Achievement::class, 'user_achievements')
            ->using(UserAchievement::class)
            ->withPivot('earned_at');
    }

    public function systemIntelligence(): HasMany
    {
        return $this->hasMany(SystemIntelligence::class);
    }
}
