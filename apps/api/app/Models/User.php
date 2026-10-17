<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
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
    'daily_focus_goal_minutes',
    'theme',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const DEFAULT_FOCUS_GOAL_MINUTES = 240;

    public const XP_PER_LEVEL = 1000;

    public const MODES = ['batman', 'wayne', 'bruce', 'playboy', 'rest'];

    public const AGGRESSIVENESS = ['mild', 'normal', 'intense'];

    public const THEMES = ['dark', 'light'];

    /**
     * Notification switches, all on unless the user turns them off, and quiet
     * hours ("HH:MM" start and end, null when unset) when Alfred's rounds stay silent.
     */
    public const NOTIFICATION_DEFAULTS = [
        'morning_brief' => true,
        'habit_reminders' => true,
        'mission_deadlines' => true,
        'alfred_alerts' => true,
        'streak_warnings' => true,
        'achievement_unlocks' => true,
        'quiet_hours_start' => null,
        'quiet_hours_end' => null,
    ];

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
            'daily_focus_goal_minutes' => 'integer',
        ];
    }

    /**
     * Adds XP and recalculates the level. Returns whether the user levelled up.
     * Features award XP through App\Services\Xp, which also records it.
     */
    public function gainXp(int $xp): bool
    {
        $before = $this->current_level;
        $this->total_xp = max(0, $this->total_xp + $xp);
        $this->current_level = intdiv($this->total_xp, self::XP_PER_LEVEL) + 1;
        $this->save();

        return $this->current_level > $before;
    }

    /** The saved preferences over the defaults, so every key is present. */
    public function notificationPreferences(): array
    {
        return [...self::NOTIFICATION_DEFAULTS, ...array_intersect_key($this->notification_preferences ?? [], self::NOTIFICATION_DEFAULTS)];
    }

    public function wantsNotification(string $key): bool
    {
        return (bool) ($this->notificationPreferences()[$key] ?? true);
    }

    /** Whether it's within the user's quiet hours now, in their timezone. Spans midnight when start > end. */
    public function inQuietHours(?CarbonInterface $now = null): bool
    {
        ['quiet_hours_start' => $start, 'quiet_hours_end' => $end] = $this->notificationPreferences();
        if (! $start || ! $end || $start === $end) {
            return false;
        }

        $time = CarbonImmutable::instance($now ?? now())->setTimezone($this->timezone)->format('H:i');

        return $start < $end ? $time >= $start && $time < $end : $time >= $start || $time < $end;
    }

    /** A user created in memory hasn't loaded the column defaults yet. */
    public function mode(): string
    {
        return $this->current_mode ?? 'bruce';
    }

    public function aggressiveness(): string
    {
        return $this->alfred_aggressiveness ?? 'normal';
    }

    public function focusGoalMinutes(): int
    {
        return $this->daily_focus_goal_minutes ?? self::DEFAULT_FOCUS_GOAL_MINUTES;
    }

    /** Midnight today in the user's timezone. */
    public function today(): CarbonImmutable
    {
        return CarbonImmutable::now($this->timezone)->startOfDay();
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

    public function savingsGoals(): HasMany
    {
        return $this->hasMany(SavingsGoal::class);
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

    public function xpEvents(): HasMany
    {
        return $this->hasMany(XpEvent::class);
    }

    public function activityDays(): HasMany
    {
        return $this->hasMany(UserActivityDay::class);
    }

    public function weeklyReports(): HasMany
    {
        return $this->hasMany(WeeklyReport::class);
    }

    public function systemIntelligence(): HasMany
    {
        return $this->hasMany(SystemIntelligence::class);
    }
}
