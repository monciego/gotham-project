<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One XP change, written by App\Services\Xp. */
#[Fillable(['amount', 'reason', 'label', 'total_after', 'level_before', 'level_after'])]
class XpEvent extends Model
{
    const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'total_after' => 'integer',
            'level_before' => 'integer',
            'level_after' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
