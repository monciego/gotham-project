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
            'current_mode' => $this->mode(),
            'total_xp' => $this->total_xp,
            'current_level' => $this->current_level,
            'notification_preferences' => $this->notificationPreferences(),
            'work_start_time' => $this->work_start_time === null ? null : substr($this->work_start_time, 0, 5),
            'work_end_time' => $this->work_end_time === null ? null : substr($this->work_end_time, 0, 5),
            'alfred_aggressiveness' => $this->aggressiveness(),
            'theme' => $this->theme ?? 'dark',
            'show_nav_subtitles' => $this->show_nav_subtitles ?? true,
            'onboarding_completed' => $this->onboarding_completed,
            'daily_focus_goal_minutes' => $this->focusGoalMinutes(),
            'created_at' => $this->created_at,
        ];
    }
}
