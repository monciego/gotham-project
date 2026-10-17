<?php

namespace App\Http\Resources;

use App\Models\CaseMilestone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CaseMilestone */
class CaseMilestoneResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $targetDate = $this->target_date->toDateString();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'target_date' => $targetDate,
            'completed' => $this->completed,
            'completed_at' => $this->completed_at,
            'is_overdue' => ! $this->completed && $targetDate < $request->user()->today()->toDateString(),
        ];
    }
}
