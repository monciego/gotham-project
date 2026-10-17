<?php

namespace App\Http\Resources;

use App\Models\Achievement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A trophy just awarded, as the completion responses return it.
 *
 * @mixin Achievement
 */
class EarnedTrophyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'rarity' => $this->rarity,
            'xp_reward' => $this->xp_reward,
        ];
    }
}
