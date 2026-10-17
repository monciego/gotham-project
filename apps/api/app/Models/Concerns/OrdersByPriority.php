<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * For models with a critical/high/medium/low `priority` column, which would
 * otherwise sort alphabetically.
 */
trait OrdersByPriority
{
    public function scopeOrderByPriority(Builder $query): void
    {
        $query->orderByRaw(
            "case priority when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end"
        );
    }
}
