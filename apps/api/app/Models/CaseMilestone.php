<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['name', 'target_date', 'completed', 'completed_at'])]
class CaseMilestone extends Model
{
    protected $attributes = ['completed' => false];

    protected function casts(): array
    {
        return [
            'target_date' => 'date',
            'completed' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseFile::class, 'case_id');
    }

    public function scopeCompleted(Builder $query): void
    {
        $query->where('completed', true);
    }

    public function scopeUpcoming(Builder $query): void
    {
        $query->where('completed', false)->orderBy('target_date');
    }
}
