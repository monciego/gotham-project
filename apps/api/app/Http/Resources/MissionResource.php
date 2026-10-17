<?php

namespace App\Http\Resources;

use App\Models\Mission;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Mission */
class MissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'title' => $this->title,
            'description' => $this->description,
            'why_it_matters' => $this->why_it_matters,
            'priority' => $this->priority,
            'status' => $this->status,
            'due_date' => $this->due_date?->toDateString(),
            'due_time' => $this->due_time,
            'is_overdue' => $this->status !== 'completed'
                && $this->due_date?->toDateString() < $request->user()->today()->toDateString(),
            'estimated_minutes' => $this->estimated_minutes,
            'actual_minutes' => $this->actual_minutes,
            'times_postponed' => $this->times_postponed,
            'energy_required' => $this->energy_required,
            'tags' => $this->tags ?? [],
            'completed_at' => $this->completed_at,
        ];
    }
}
