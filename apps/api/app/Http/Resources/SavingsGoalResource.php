<?php

namespace App\Http\Resources;

use App\Models\SavingsGoal;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SavingsGoal */
class SavingsGoalResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $today = $request->user()->today();
        $target = (float) $this->target_amount;
        $current = (float) $this->current_amount;
        $expected = $this->expectedBy($today);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'target_amount' => $target,
            'current_amount' => $current,
            'percentage' => $target > 0 ? min(100, (int) floor($current / $target * 100)) : 0,
            'deadline' => $this->deadline?->toDateString(),
            'days_left' => $this->deadline
                ? (int) CarbonImmutable::parse($today->toDateString())->diffInDays(CarbonImmutable::parse($this->deadline->toDateString()), false)
                : null,
            // Saving evenly from creation to the deadline, this is where the goal would be today.
            'expected_amount' => $expected,
            'on_track' => $this->completed ? true : ($expected === null ? null : $current >= $expected),
            'completed' => $this->completed,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'contributions' => ResourceResource::collection($this->whenLoaded('contributions')),
        ];
    }
}
