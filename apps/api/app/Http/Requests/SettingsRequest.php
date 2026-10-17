<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Any subset of the settings. Notification preferences merge into the saved ones. */
class SettingsRequest extends FormRequest
{
    private const SWITCHES = ['morning_brief', 'habit_reminders', 'mission_deadlines', 'alfred_alerts', 'streak_warnings', 'achievement_unlocks'];

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'notification_preferences' => ['sometimes', 'array:'.implode(',', array_keys(User::NOTIFICATION_DEFAULTS))],
            ...collect(self::SWITCHES)->mapWithKeys(fn (string $key) => ["notification_preferences.{$key}" => ['sometimes', 'boolean']])->all(),
            'notification_preferences.quiet_hours_start' => ['nullable', 'date_format:H:i', 'required_with:notification_preferences.quiet_hours_end'],
            'notification_preferences.quiet_hours_end' => ['nullable', 'date_format:H:i', 'required_with:notification_preferences.quiet_hours_start'],
            'work_start_time' => ['nullable', 'date_format:H:i', 'required_with:work_end_time'],
            'work_end_time' => ['nullable', 'date_format:H:i', 'required_with:work_start_time', 'different:work_start_time'],
            'alfred_aggressiveness' => ['sometimes', Rule::in(User::AGGRESSIVENESS)],
            'theme' => ['sometimes', Rule::in(User::THEMES)],
            'show_nav_subtitles' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'work_end_time.different' => 'The day must end some time after it starts, sir.',
            'notification_preferences.quiet_hours_start.required_with' => 'Quiet hours need a start as well as an end.',
            'notification_preferences.quiet_hours_end.required_with' => 'Quiet hours need an end as well as a start.',
        ];
    }

    /** The validated settings, ready to save on `$user`. */
    public function settings(User $user): array
    {
        $data = $this->validated();
        // Rules without `sometimes` (so the pairs are checked together) can add nulls for fields not sent.
        $data = array_intersect_key($data, $this->all());
        if (isset($data['notification_preferences'])) {
            $data['notification_preferences'] = array_intersect_key($data['notification_preferences'], $this->input('notification_preferences'));
        }

        if (isset($data['notification_preferences'])) {
            $data['notification_preferences'] = [...$user->notificationPreferences(), ...$data['notification_preferences']];
        }

        return $data;
    }
}
