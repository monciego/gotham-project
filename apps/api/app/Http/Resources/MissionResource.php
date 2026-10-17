<?php

namespace App\Http\Resources;

use App\Models\FocusSession;
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
            // Postgres returns "HH:MM:SS"; the form works in "HH:MM".
            'due_time' => $this->due_time ? substr($this->due_time, 0, 5) : null,
            'is_overdue' => $this->isOpen()
                && $this->due_date?->toDateString() < $request->user()->today()->toDateString(),
            'estimated_minutes' => $this->estimated_minutes,
            'actual_minutes' => $this->actual_minutes,
            'times_postponed' => $this->times_postponed,
            'energy_required' => $this->energy_required,
            'tags' => $this->tags ?? [],
            'notes' => $this->notes,
            'past_self_message' => $this->past_self_message,
            'abandon_reason' => $this->abandon_reason,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'case' => $this->whenLoaded('case', fn () => $this->case ? [
                'id' => $this->case->id,
                'name' => $this->case->name,
                'color' => $this->case->color,
            ] : null),
            'subtasks_count' => $this->whenCounted('subtasks'),
            'subtasks_completed_count' => $this->whenCounted('subtasks_completed'),
            'subtasks' => SubtaskResource::collection($this->whenLoaded('subtasks')),
            'focus_sessions' => FocusSessionResource::collection($this->whenLoaded('focusSessions')),
            // Completed sessions only, like `actual_minutes`.
            'total_focus_minutes' => $this->whenLoaded('focusSessions', fn () => (int) $this->focusSessions
                ->where('completed', true)
                ->sum('duration_minutes')),
            'active_session' => $this->whenLoaded('focusSessions', function () {
                $running = $this->focusSessions->first(fn (FocusSession $session) => $session->end_time === null);

                return $running ? new FocusSessionResource($running) : null;
            }),
            'dependencies' => $this->whenLoaded('dependencies', fn () => $this->summaries($this->dependencies)),
            'dependents' => $this->whenLoaded('dependents', fn () => $this->summaries($this->dependents)),
        ];
    }

    /**
     * @param  iterable<Mission>  $missions
     * @return list<array<string, mixed>>
     */
    private function summaries(iterable $missions): array
    {
        return collect($missions)->map(fn (Mission $mission) => [
            'id' => $mission->id,
            'title' => $mission->title,
            'status' => $mission->status,
            'priority' => $mission->priority,
            'due_date' => $mission->due_date?->toDateString(),
        ])->values()->all();
    }
}
