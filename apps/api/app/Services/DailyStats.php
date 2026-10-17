<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\FocusSession;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\User;
use App\Models\UserAchievement;
use App\Support\Period;
use Illuminate\Support\Collection;

/**
 * Per-day numbers across features, keyed by Y-m-d in the user's timezone.
 * Overview, Alfred's insights and the weekly report all read from here.
 */
class DailyStats
{
    public function __construct(private ArsenalStreaks $streaks) {}

    /** @return array<string, int> minutes of completed focus by the day the session started */
    public function focusMinutes(User $user, Period $period): array
    {
        return $this->fill($period, $user->focusSessions()
            ->completed()
            ->whereBetween('start_time', [$period->startUtc(), $period->endUtc()])
            ->get(['start_time', 'duration_minutes'])
            ->groupBy(fn (FocusSession $session) => $session->start_time->setTimezone($user->timezone)->toDateString())
            ->map(fn (Collection $sessions) => (int) $sessions->sum('duration_minutes'))
            ->all());
    }

    /** @return array<string, int> missions completed, by the day they were completed */
    public function missionsCompleted(User $user, Period $period): array
    {
        return $this->fill($period, $user->missions()
            ->completed()
            ->whereBetween('completed_at', [$period->startUtc(), $period->endUtc()])
            ->get(['completed_at'])
            ->countBy(fn (Mission $mission) => $mission->completed_at->setTimezone($user->timezone)->toDateString())
            ->all());
    }

    /**
     * Each active habit's day states over the period (see ArsenalStreaks::timeline()),
     * keyed by habit id. Days before a habit existed are missing.
     *
     * @return array<int, array{habit: Arsenal, days: array<string, array{due: bool, state: string, value: int|null}>}>
     */
    public function habitTimelines(User $user, Period $period): array
    {
        $today = $user->today();
        $habits = $user->arsenal()->where('active', true)->get();
        $logs = $this->streaks->logsFor($habits, $today);
        $start = $period->start->toDateString();
        $end = $period->end->toDateString();

        return $habits->mapWithKeys(fn (Arsenal $habit) => [$habit->id => [
            'habit' => $habit,
            'days' => array_filter(
                $this->streaks->timeline($habit, $logs->get($habit->id, collect()), $today, $user->timezone),
                fn (string $date) => $date >= $start && $date <= $end,
                ARRAY_FILTER_USE_KEY,
            ),
        ]])->all();
    }

    /**
     * Habits due and done each day. `completed` also counts weekly habits,
     * which have no due days.
     *
     * @param  array<int, array{habit: Arsenal, days: array<string, array{due: bool, state: string}>}>|null  $timelines
     * @return array<string, array{due: int, done: int, completed: int}>
     */
    public function habits(User $user, Period $period, ?array $timelines = null): array
    {
        $days = array_fill_keys($period->dates(), ['due' => 0, 'done' => 0, 'completed' => 0]);

        foreach ($timelines ?? $this->habitTimelines($user, $period) as ['days' => $timeline]) {
            foreach ($timeline as $date => $day) {
                if (! isset($days[$date])) {
                    continue;
                }
                $completed = $day['state'] === 'completed';
                // Today isn't over, so an unchecked habit doesn't count against it yet.
                $days[$date]['due'] += (int) ($day['due'] && $day['state'] !== 'pending');
                $days[$date]['done'] += (int) ($day['due'] && $completed);
                $days[$date]['completed'] += (int) $completed;
            }
        }

        return $days;
    }

    /** @return array<string, array{mood: int, energy: int|null, stress: int|null}> journal days only */
    public function intel(User $user, Period $period): array
    {
        return $user->intel()
            ->whereDate('date', '>=', $period->start)
            ->whereDate('date', '<=', $period->end)
            ->orderBy('date')
            ->get(['date', 'mood', 'energy_level', 'stress_level'])
            ->mapWithKeys(fn (Intel $entry) => [$entry->date->toDateString() => [
                'mood' => Intel::MOOD_SCORES[$entry->mood] ?? 3,
                'energy' => $entry->energy_level,
                'stress' => $entry->stress_level,
            ]])
            ->all();
    }

    /** XP from missions, focus, habits, Intel, cases and trophies earned in the period. */
    public function xpEarned(User $user, Period $period): int
    {
        $between = [$period->startUtc(), $period->endUtc()];
        $dates = [$period->start->toDateString(), $period->end->toDateString()];

        return (int) $user->missions()->whereBetween('completed_at', $between)->sum('xp_awarded')
            + (int) $user->focusSessions()->whereBetween('start_time', $between)->sum('xp_awarded')
            + (int) ArsenalLog::where('user_id', $user->id)->whereDate('date', '>=', $dates[0])->whereDate('date', '<=', $dates[1])->sum('xp_awarded')
            + (int) $user->intel()->whereDate('date', '>=', $dates[0])->whereDate('date', '<=', $dates[1])->sum('xp_awarded')
            + (int) $user->cases()->whereDate('actual_end_date', '>=', $dates[0])->whereDate('actual_end_date', '<=', $dates[1])->sum('xp_awarded')
            + (int) UserAchievement::query()
                ->join('achievements', 'achievements.id', '=', 'user_achievements.achievement_id')
                ->where('user_achievements.user_id', $user->id)
                ->whereBetween('user_achievements.earned_at', $between)
                ->sum('achievements.xp_reward');
    }

    /**
     * @param  array<string, int>  $values
     * @return array<string, int> every day of the period, 0 where nothing happened
     */
    private function fill(Period $period, array $values): array
    {
        return array_map(fn (string $date) => $values[$date] ?? 0, array_combine($period->dates(), $period->dates()));
    }
}
