<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A mission's due date pushed later (counted in `missions.times_postponed`). */
#[Fillable(['user_id', 'from_date', 'to_date'])]
class MissionPostponement extends Model
{
    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'from_date' => 'date',
            'to_date' => 'date',
        ];
    }

    public function mission(): BelongsTo
    {
        return $this->belongsTo(Mission::class);
    }
}
