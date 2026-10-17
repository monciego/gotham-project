<?php

namespace App\Services;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Eloquent\SoftDeletes;
use RuntimeException;
use ZipArchive;

/**
 * Everything the user has in Gotham, as one JSON file per feature in a ZIP.
 * Deleted habits, missions and cases are included, with `deleted_at` set.
 */
class DataExport
{
    /** @return string The path of a temporary ZIP file; the caller deletes it. */
    public function zip(User $user): string
    {
        $path = tempnam(sys_get_temp_dir(), 'gotham-export-');
        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Could not create the export archive.');
        }

        foreach ($this->files($user) as $name => $data) {
            $zip->addFromString("{$name}.json", json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        }

        $zip->close();

        return $path;
    }

    /** @return array<string, mixed> File name (without .json) => contents. */
    private function files(User $user): array
    {
        return [
            'profile' => [
                ...(new UserResource($user))->resolve(),
                'exported_at' => now()->toIso8601String(),
            ],
            'missions' => $this->all($user->missions()->with(['subtasks', 'postponements'])),
            'cases' => $this->all($user->cases()->with(['milestones', 'progressLogs'])),
            'arsenal' => $this->all($user->arsenal()),
            'arsenal_logs' => $this->all($user->arsenalLogs()),
            'intel' => $this->all($user->intel()),
            'resources' => $this->all($user->resources()),
            'budgets' => $this->all($user->budgets()),
            'savings_goals' => $this->all($user->savingsGoals()),
            'operations' => $this->all($user->operations()),
            'focus_sessions' => $this->all($user->focusSessions()),
            'trophies' => $user->achievements()->orderBy('user_achievements.earned_at')->get()
                ->map(fn ($achievement) => [
                    'key' => $achievement->key,
                    'name' => $achievement->name,
                    'description' => $achievement->description,
                    'earned_at' => $achievement->pivot->earned_at,
                ]),
            'xp_history' => $this->all($user->xpEvents()),
            'alfred_messages' => $this->all($user->alfredMessages()),
            'weekly_reports' => $this->all($user->weeklyReports()),
            'activity_days' => $this->all($user->activityDays()),
            'alfred_patterns' => $this->all($user->systemIntelligence()),
        ];
    }

    private function all(Relation $relation): array
    {
        $query = $relation->getQuery();

        if (in_array(SoftDeletes::class, class_uses_recursive($relation->getRelated()), true)) {
            $query->withTrashed();
        }

        return $query->orderBy($relation->getRelated()->getQualifiedKeyName())->get()->toArray();
    }
}
