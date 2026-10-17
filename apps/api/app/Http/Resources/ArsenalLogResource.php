<?php

namespace App\Http\Resources;

use App\Models\ArsenalLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ArsenalLog */
class ArsenalLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date->toDateString(),
            'completed' => $this->completed,
            'skipped' => $this->skipped,
            'value' => $this->value,
            'note' => $this->note,
            'xp_awarded' => $this->xp_awarded,
            'completed_at' => $this->completed_at,
        ];
    }
}
