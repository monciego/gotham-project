<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Money set aside toward a target: the sum of the transactions linked to it. */
#[Fillable(['name', 'target_amount', 'deadline'])]
class SavingsGoal extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
            'current_amount' => 'decimal:2',
            'deadline' => 'date',
            'completed' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Resource::class);
    }

    /**
     * Recounts the linked transactions and marks the goal completed (or not).
     *
     * @return bool Whether this change completed it.
     */
    public function recalculate(): bool
    {
        $current = (float) $this->contributions()->sum('amount');
        $reached = $current >= (float) $this->target_amount;
        $justCompleted = $reached && ! $this->completed;

        $this->forceFill([
            'current_amount' => $current,
            'completed' => $reached,
            'completed_at' => $reached ? ($this->completed_at ?? now()) : null,
        ])->save();

        return $justCompleted;
    }

    /**
     * Where the goal should be by today to hit its deadline, saving evenly
     * from the day it was created. Null without a deadline.
     */
    public function expectedBy(CarbonImmutable $today): ?float
    {
        if ($this->deadline === null) {
            return null;
        }

        // Whole calendar days, in the user's timezone for the start and today.
        $start = CarbonImmutable::parse($this->created_at->setTimezone($today->getTimezone())->toDateString());
        $total = max(1, (int) $start->diffInDays(CarbonImmutable::parse($this->deadline->toDateString())));
        $elapsed = min($total, max(0, (int) $start->diffInDays(CarbonImmutable::parse($today->toDateString()))));

        return round((float) $this->target_amount * $elapsed / $total, 2);
    }
}
