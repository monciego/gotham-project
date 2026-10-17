<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A case's progress at the end of a day (see App\Services\CaseProgress). */
#[Fillable(['date', 'progress'])]
class CaseProgressLog extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'progress' => 'integer',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseFile::class, 'case_id');
    }
}
