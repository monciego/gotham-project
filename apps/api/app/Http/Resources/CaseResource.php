<?php

namespace App\Http\Resources;

use App\Models\CaseFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A case with its mission counts and schedule. The detail adds its
 * missions, milestones and analytics.
 *
 * @mixin CaseFile
 */
class CaseResource extends JsonResource
{
    /** @var array<string, mixed>|null */
    private ?array $analytics = null;

    /** @param  array<string, mixed>  $analytics  From App\Services\CaseAnalytics. */
    public function withAnalytics(array $analytics): static
    {
        $this->analytics = $analytics;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'category' => $this->category,
            'start_date' => $this->start_date->toDateString(),
            'target_end_date' => $this->target_end_date?->toDateString(),
            'actual_end_date' => $this->actual_end_date?->toDateString(),
            'progress' => $this->progress,
            'progress_mode' => $this->progress_mode,
            'color' => $this->color,
            'tags' => $this->tags ?? [],
            'notes' => $this->notes,
            'xp_awarded' => $this->xp_awarded,
            'created_at' => $this->created_at,
            // From withMissionCounts(); abandoned missions don't count.
            'missions_total' => (int) $this->missions_total,
            'missions_completed' => (int) $this->missions_completed,
            'schedule' => $this->schedule($request->user()->today()),
            'missions' => MissionResource::collection($this->whenLoaded('missions')),
            'milestones' => CaseMilestoneResource::collection($this->whenLoaded('milestones')),
            'analytics' => $this->when($this->analytics !== null, fn () => $this->analytics),
        ];
    }
}
