<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin User */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at,
            'timezone' => $this->timezone,
            'avatar_url' => $this->avatar ? Storage::disk('public')->url($this->avatar) : null,
            'current_mode' => $this->current_mode,
            'total_xp' => $this->total_xp,
            'current_level' => $this->current_level,
            'notification_preferences' => $this->notification_preferences,
            'work_start_time' => $this->work_start_time,
            'work_end_time' => $this->work_end_time,
            'alfred_aggressiveness' => $this->alfred_aggressiveness,
            'onboarding_completed' => $this->onboarding_completed,
            'created_at' => $this->created_at,
        ];
    }
}
