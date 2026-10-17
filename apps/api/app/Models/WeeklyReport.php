<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A saved weekly report; `report` is what App\Services\ReportService builds. */
#[Fillable(['week_start', 'report'])]
class WeeklyReport extends Model
{
    protected function casts(): array
    {
        return [
            'week_start' => 'date',
            'report' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
