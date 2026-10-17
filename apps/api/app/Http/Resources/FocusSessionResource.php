<?php

namespace App\Http\Resources;

use App\Models\FocusSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FocusSession */
class FocusSessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mission_id' => $this->mission_id,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'duration_minutes' => $this->duration_minutes,
            'completed' => $this->completed,
            'energy_before' => $this->energy_before,
            'energy_after' => $this->energy_after,
            'notes' => $this->notes,
        ];
    }
}
