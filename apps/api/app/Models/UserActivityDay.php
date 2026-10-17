<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A day (user's timezone) the user opened the app (App\Http\Middleware\RecordDailyActivity). */
#[Fillable(['date'])]
class UserActivityDay extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
