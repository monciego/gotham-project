<?php

namespace App\Http\Resources;

use App\Models\Achievement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A trophy just awarded, as the completion responses return it. The same
 * trophies also arrive in the response's `rewards` (App\Support\Rewards).
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
            'id' => $this->id,
            'key' => $this->key,
            'name' => $this->name,
            'description' => $this->description,
            'icon' => $this->icon,
            'rarity' => $this->rarity,
            'xp_reward' => $this->xp_reward,
        ];
    }
}
