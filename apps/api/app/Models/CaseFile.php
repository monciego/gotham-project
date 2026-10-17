<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A Case (project). Named CaseFile because "case" is a reserved word in PHP.
 */
#[Table('cases')]
#[Fillable([
    'name',
    'description',
    'status',
    'category',
    'start_date',
    'target_end_date',
    'actual_end_date',
    'progress',
    'progress_mode',
    'color',
    'tags',
    'notes',
])]
class CaseFile extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'target_end_date' => 'date',
            'actual_end_date' => 'date',
            'progress' => 'integer',
            'tags' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function missions(): HasMany
    {
        return $this->hasMany(Mission::class, 'case_id');
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(CaseMilestone::class, 'case_id');
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('status', 'active');
    }

    /** Still being worked on: not completed and not archived. */
    public function scopeOpen(Builder $query): void
    {
        $query->whereIn('status', ['planning', 'active', 'on_hold']);
    }

    public function scopeCompleted(Builder $query): void
    {
        $query->where('status', 'completed');
    }
}
