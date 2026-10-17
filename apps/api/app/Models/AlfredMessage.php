<?php

namespace App\Models;

use App\Models\Concerns\OrdersByPriority;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Something Alfred says. `actions` are [{label, href?, action?, variant?}]:
 * `href` is a link; `action` is run by POST /alfred/messages/{id}/action
 * (see App\Http\Controllers\AlfredController). Typed messages come from
 * App\Services\AlfredService.
 */
#[Fillable([
    'type',
    'subject_id',
    'priority',
    'mood',
    'title',
    'message',
    'actions',
    'requires_action',
    'read_at',
    'dismissed_at',
    'action_taken',
    'acted_at',
])]
class AlfredMessage extends Model
{
    use HasFactory, OrdersByPriority;

    protected function casts(): array
    {
        return [
            'actions' => 'array',
            'requires_action' => 'boolean',
            'read_at' => 'datetime',
            'dismissed_at' => 'datetime',
            'action_taken' => 'boolean',
            'acted_at' => 'datetime',
            'subject_id' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread(Builder $query): void
    {
        $query->whereNull('read_at');
    }

    /** Not dismissed yet. */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('dismissed_at');
    }

    public function scopeAwaitingAction(Builder $query): void
    {
        $query->where('requires_action', true)->where('action_taken', false);
    }
}
