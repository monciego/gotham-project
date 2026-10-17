<?php

namespace App\Http\Resources;

use App\Models\Resource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A transaction. (The model is called Resource; this is its API resource.)
 *
 * @mixin Resource
 */
class ResourceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'amount' => (float) $this->amount,
            'category' => $this->category,
            'description' => $this->description,
            'date' => $this->date->toDateString(),
            'account' => $this->account,
            'recurring' => $this->recurring,
            'recurring_frequency' => $this->recurring_frequency,
            'recurring_source_id' => $this->recurring_source_id,
            'savings_goal_id' => $this->savings_goal_id,
            'created_at' => $this->created_at,
        ];
    }
}
