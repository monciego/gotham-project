<?php

namespace App\Http\Controllers;

use App\Http\Requests\IntelRequest;
use App\Http\Resources\EarnedTrophyResource;
use App\Http\Resources\IntelResource;
use App\Models\Intel;
use App\Services\AchievementService;
use App\Services\IntelAlerts;
use App\Services\IntelPrompts;
use App\Services\IntelSentiment;
use App\Services\Xp;
use App\Support\RichText;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** The journal: one entry per day. */
class IntelController extends Controller
{
    public function __construct(
        private IntelSentiment $sentiment,
        private IntelAlerts $alerts,
        private IntelPrompts $prompts,
        private AchievementService $achievements,
        private Xp $xp,
    ) {}

    /** Newest first. `from` / `to` are Y-m-d; `search` looks in the text and tags. */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
            'mood' => ['sometimes', Rule::in(Intel::MOODS)],
            'tag' => ['sometimes', 'string', 'max:30'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $page = $request->user()->intel()
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('date', '<=', $to))
            ->when($filters['mood'] ?? null, fn (Builder $query, string $mood) => $query->where('mood', $mood))
            ->when($filters['tag'] ?? null, fn (Builder $query, string $tag) => $query->whereJsonContains('tags', $tag))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->whereLike('content', "%{$search}%")->orWhereLike('tags', "%{$search}%")
            ))
            ->latest('date')
            ->paginate($filters['per_page'] ?? 20);

        return $this->success([
            'items' => IntelResource::collection($page->items()),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /** +5 XP, sentiment, and Alfred's checks for burnout and hard stretches. */
    public function store(IntelRequest $request): JsonResponse
    {
        $user = $request->user();
        $levelBefore = $user->current_level;

        [$entry, $trophies] = DB::transaction(function () use ($request, $user) {
            $entry = $user->intel()->make();
            $this->fill($entry, $request);
            // Not mass-assignable, so requests can't set it.
            $entry->forceFill(['xp_awarded' => Intel::XP])->save();
            $this->xp->award($user, Intel::XP, 'journal_save', "Intel for {$entry->date->toFormattedDateString()}");

            $this->alerts->check($user, $entry);

            return [$entry, $this->achievements->checkAndAward($user, 'journal_save')];
        });

        $user->refresh();

        return $this->success([
            'entry' => new IntelResource($entry),
            'xp_awarded' => Intel::XP,
            'total_xp' => $user->total_xp,
            'current_level' => $user->current_level,
            'level_up' => $user->current_level > $levelBefore,
            'achievements' => EarnedTrophyResource::collection($trophies->values()),
        ], "Intel filed, sir. Gotham's patterns are becoming clearer.", 201);
    }

    /** The entry, with the ids of the entries before and after it. */
    public function show(Request $request, int $intel): JsonResponse
    {
        $user = $request->user();
        $entry = $user->intel()->findOrFail($intel);

        return $this->success([
            'entry' => new IntelResource($entry),
            'previous_id' => $user->intel()->whereDate('date', '<', $entry->date)->orderByDesc('date')->value('id'),
            'next_id' => $user->intel()->whereDate('date', '>', $entry->date)->orderBy('date')->value('id'),
        ]);
    }

    public function update(IntelRequest $request, int $intel): JsonResponse
    {
        $user = $request->user();
        $entry = $user->intel()->findOrFail($intel);

        $this->fill($entry, $request);
        $entry->save();
        $this->alerts->check($user, $entry);
        // Gratitude added later still counts toward its trophy.
        $this->achievements->checkAndAward($user, 'journal_save');

        return $this->success(new IntelResource($entry), 'Intel updated.');
    }

    /** Takes back the entry's XP. */
    public function destroy(Request $request, int $intel): JsonResponse
    {
        $user = $request->user();
        $entry = $user->intel()->findOrFail($intel);

        DB::transaction(function () use ($user, $entry) {
            $this->xp->award($user, -$entry->xp_awarded, 'journal_delete', "Intel for {$entry->date->toFormattedDateString()}");
            $entry->delete();
        });

        return $this->success(message: 'Intel deleted.');
    }

    /** A journal prompt for today, from what the day held. */
    public function prompt(Request $request): JsonResponse
    {
        return $this->success($this->prompts->for($request->user()));
    }

    /**
     * The numbers above and beside the journal: this month's entries, the
     * current daily streak, average mood, the last 7 days' moods, this week's
     * energy and the most used tags.
     */
    public function insights(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = $user->today();
        $entries = $user->intel()->get(['date', 'mood', 'energy_level', 'tags']);
        $byDate = $entries->keyBy(fn (Intel $entry) => $entry->date->toDateString());
        $thisMonth = $entries->filter(fn (Intel $entry) => $entry->date->format('Y-m') === $today->format('Y-m'));
        $lastWeek = $entries->filter(fn (Intel $entry) => $entry->date->toDateString() > $today->subDays(7)->toDateString());

        return $this->success([
            'entries_this_month' => $thisMonth->count(),
            'streak' => $this->streak($byDate, $today),
            'mood_average' => $this->moodAverage($thisMonth),
            'mood_trend' => collect(range(6, 0))->map(fn (int $daysAgo) => [
                'date' => $date = $today->subDays($daysAgo)->toDateString(),
                'mood' => $byDate->get($date)?->mood,
            ])->values(),
            'average_energy' => $lastWeek->isEmpty() ? null : round($lastWeek->avg('energy_level'), 1),
            'top_tags' => $entries->flatMap(fn (Intel $entry) => $entry->tags ?? [])
                ->countBy()
                ->sortDesc()
                ->take(3)
                ->map(fn (int $count, string $tag) => ['tag' => $tag, 'count' => $count])
                ->values(),
        ]);
    }

    private function fill(Intel $entry, IntelRequest $request): void
    {
        $data = $request->validated();

        if (array_key_exists('content', $data)) {
            $data['content'] = RichText::clean($data['content']);

            if (RichText::plain($data['content']) === '') {
                throw ValidationException::withMessages(['content' => 'Write a few words first, sir.']);
            }

            $sentiment = $this->sentiment->analyze(RichText::plain($data['content']));
            $data['sentiment'] = $sentiment['score'];
            $data['sentiment_label'] = $sentiment['label'];
        }

        foreach (['gratitude', 'wins', 'struggles'] as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = trim((string) $data[$field]) ?: null;
            }
        }

        $entry->fill($data);
    }

    /** Consecutive days with an entry, ending today (or yesterday, while today is still unwritten). */
    private function streak(Collection $byDate, CarbonImmutable $today): int
    {
        $day = $byDate->has($today->toDateString()) ? $today : $today->subDay();
        $streak = 0;

        while ($byDate->has($day->toDateString())) {
            $streak++;
            $day = $day->subDay();
        }

        return $streak;
    }

    /** @return array{score: float, mood: string}|null */
    private function moodAverage(Collection $entries): ?array
    {
        if ($entries->isEmpty()) {
            return null;
        }

        $score = $entries->avg(fn (Intel $entry) => Intel::MOOD_SCORES[$entry->mood]);

        return [
            'score' => round($score, 1),
            'mood' => array_search((int) round($score), Intel::MOOD_SCORES, true),
        ];
    }
}
