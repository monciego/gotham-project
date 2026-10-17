<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One habit in the user's Arsenal.
 *
 * `frequency` depends on `type`:
 * - daily, measurable, yes_no: ignored, due every day
 * - specific_days: {"days": [1, 3, 5]}, ISO weekdays (1 = Monday, 7 = Sunday)
 * - interval: {"every": 3}, due once N days have passed since it was last done or skipped
 *   (from the day it was created until the first time)
 * - weekly: {"times": 3}, due any day until done that many times in the week (Monday to Sunday)
 *
 * `mode_specific` lists the modes it applies in; empty means every mode.
 * Due-day, streak and grace rules live in App\Services\ArsenalStreaks.
 */
#[Table('arsenal')]
#[Fillable([
    'name',
    'description',
    'category',
    'type',
    'frequency',
    'target_value',
    'unit',
    'reminder_time',
    'current_streak',
    'best_streak',
    'active',
    'mode_specific',
])]
class Arsenal extends Model
{
    use HasFactory, SoftDeletes;

    public const CATEGORIES = ['health', 'productivity', 'learning', 'social', 'mental', 'physical', 'other'];

    public const TYPES = ['daily', 'weekly', 'specific_days', 'interval', 'measurable', 'yes_no'];

    public const MODES = ['batman', 'wayne', 'bruce', 'playboy', 'rest'];

    /** XP for each check-in, plus a bonus when a measurable habit reaches its target. */
    public const XP = 10;

    public const XP_TARGET_BONUS = 20;

    protected function casts(): array
    {
        return [
            'frequency' => 'array',
            'target_value' => 'integer',
            'current_streak' => 'integer',
            'best_streak' => 'integer',
            'active' => 'boolean',
            'mode_specific' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ArsenalLog::class);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('active', true);
    }

    public function isWeekly(): bool
    {
        return $this->type === 'weekly';
    }

    /** First day the habit counts, in the given timezone. */
    public function startDate(string $timezone): CarbonImmutable
    {
        return CarbonImmutable::parse($this->created_at)->setTimezone($timezone)->startOfDay();
    }

    public function isMeasurable(): bool
    {
        return $this->type === 'measurable';
    }

    /** Whether the habit applies in this mode. */
    public function allowsMode(string $mode): bool
    {
        return empty($this->mode_specific) || in_array($mode, $this->mode_specific, true);
    }

    /** Check-in XP for a value logged today. */
    public function xpFor(?int $value): int
    {
        $reachedTarget = $this->isMeasurable() && $value !== null && $value >= (int) $this->target_value;

        return self::XP + ($reachedTarget ? self::XP_TARGET_BONUS : 0);
    }

    /** Only the keys that matter for the type, e.g. {"days": [1, 3]} for specific_days. */
    public static function normalizeFrequency(string $type, ?array $frequency): array
    {
        return match ($type) {
            'weekly' => ['times' => (int) ($frequency['times'] ?? 1)],
            'specific_days' => ['days' => collect($frequency['days'] ?? [])->map(fn ($day) => (int) $day)->unique()->sort()->values()->all()],
            'interval' => ['every' => (int) ($frequency['every'] ?? 1)],
            default => [],
        };
    }
}
