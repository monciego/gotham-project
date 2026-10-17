<?php

namespace App\Models;

use App\Models\Concerns\OrdersByPriority;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'priority',
    'mood',
    'title',
    'message',
    'actions',
    'requires_action',
    'read_at',
    'dismissed_at',
    'action_taken',
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
