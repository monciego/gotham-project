<?php

namespace App\Http\Controllers;

use App\Models\Arsenal;
use App\Models\CaseFile;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\Operation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * GET /search?q=: the command palette. A case-insensitive match on each
 * feature's text, grouped by feature, at most 5 each, title matches first.
 * Each result is {id, type, title, snippet, route, meta}.
 */
class SearchController extends Controller
{
    private const LIMIT = 5;

    /** Rows read per feature before ranking; Intel may drop some (matches inside markup). */
    private const CANDIDATES = 20;

    private const SNIPPET_LENGTH = 140;

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']]);
        $term = trim(preg_replace('/\s+/', ' ', $validated['q']));
        $user = $request->user();

        $results = [
            'missions' => $this->missions($user, $term),
            'arsenal' => $this->arsenal($user, $term),
            'intel' => $this->intel($user, $term),
            'cases' => $this->cases($user, $term),
            'operations' => $this->operations($user, $term),
        ];

        return $this->success([
            'query' => $term,
            'results' => $results,
            'total' => collect($results)->sum(fn (array $group) => count($group)),
        ]);
    }

    private function missions(User $user, string $term): array
    {
        $missions = $this->matching($user->missions(), ['title', 'description', 'why_it_matters'], $term)
            // Open missions first.
            ->orderByRaw("case when status in ('not_started', 'in_progress') then 0 else 1 end")
            ->orderBy('due_date')
            ->limit(self::CANDIDATES)
            ->get();

        return $this->ranked($missions, $term, fn (Mission $mission) => [
            'id' => $mission->id,
            'type' => 'mission',
            'title' => $mission->title,
            'snippet' => $this->snippet($term, $mission->description, $mission->why_it_matters),
            'route' => "/missions/{$mission->id}",
            'meta' => match ($mission->status) {
                'completed' => 'Completed',
                'abandoned' => 'Abandoned',
                default => 'Due '.$mission->due_date->format('M j'),
            },
        ]);
    }

    private function arsenal(User $user, string $term): array
    {
        $habits = $this->matching($user->arsenal(), ['name', 'description'], $term)
            ->orderByDesc('active')
            ->orderBy('name')
            ->limit(self::CANDIDATES)
            ->get();

        return $this->ranked($habits, $term, fn (Arsenal $habit) => [
            'id' => $habit->id,
            'type' => 'arsenal',
            'title' => $habit->name,
            'snippet' => $this->snippet($term, $habit->description),
            'route' => "/arsenal/{$habit->id}",
            'meta' => $habit->active ? "{$habit->current_streak}-day streak" : 'Paused',
        ], titleField: 'name');
    }

    /** Matches the entry's words and tags, not its markup. */
    private function intel(User $user, string $term): array
    {
        $entries = $this->matching($user->intel(), ['content', 'tags'], $term)
            ->orderByDesc('date')
            ->limit(self::CANDIDATES)
            ->get()
            ->filter(fn (Intel $entry) => Str::contains($entry->plainContent(), $term, ignoreCase: true)
                || collect($entry->tags ?? [])->contains(fn (string $tag) => Str::contains($tag, $term, ignoreCase: true)));

        return $entries->take(self::LIMIT)->map(fn (Intel $entry) => [
            'id' => $entry->id,
            'type' => 'intel',
            'title' => $entry->date->format('l, F j, Y'),
            'snippet' => $this->snippet($term, $entry->plainContent()) ?? $this->tagList($entry->tags),
            'route' => "/intel/{$entry->id}",
            'meta' => $entry->mood ? ucfirst($entry->mood) : null,
        ])->values()->all();
    }

    private function cases(User $user, string $term): array
    {
        $cases = $this->matching($user->cases(), ['name', 'description'], $term)
            ->orderByRaw("case when status in ('planning', 'active', 'on_hold') then 0 else 1 end")
            ->orderBy('name')
            ->limit(self::CANDIDATES)
            ->get();

        return $this->ranked($cases, $term, fn (CaseFile $case) => [
            'id' => $case->id,
            'type' => 'case',
            'title' => $case->name,
            'snippet' => $this->snippet($term, $case->description),
            'route' => "/cases/{$case->id}",
            'meta' => Str::headline($case->status)." · {$case->progress}%",
        ], titleField: 'name');
    }

    /** Opens the calendar on the event's day, in the user's timezone. */
    private function operations(User $user, string $term): array
    {
        $events = $this->matching($user->operations(), ['title', 'description'], $term)
            // Upcoming first, then the most recent past ones.
            ->orderByRaw('case when start_time >= ? then 0 else 1 end', [now()])
            ->orderByRaw('case when start_time >= ? then start_time end asc', [now()])
            ->orderByDesc('start_time')
            ->limit(self::CANDIDATES)
            ->get();

        return $this->ranked($events, $term, function (Operation $event) use ($user, $term) {
            $start = CarbonImmutable::parse($event->start_time)->setTimezone($user->timezone);

            return [
                'id' => $event->id,
                'type' => 'operation',
                'title' => $event->title,
                'snippet' => $this->snippet($term, $event->description),
                'route' => '/operations?date='.$start->toDateString(),
                'meta' => $event->all_day ? $start->format('M j') : $start->format('M j, g:i A'),
            ];
        });
    }

    /** @param  list<string>  $columns */
    private function matching(HasMany $relation, array $columns, string $term): Builder
    {
        return $relation->getQuery()->where(function (Builder $query) use ($columns, $term) {
            foreach ($columns as $column) {
                $query->orWhereLike($column, "%{$term}%");
            }
        });
    }

    /** Title matches first (keeping the query's order within each), the first five. */
    private function ranked(Collection $models, string $term, callable $present, string $titleField = 'title'): array
    {
        return $models
            ->sortBy(fn ($model, int $index) => [Str::contains($model->{$titleField}, $term, ignoreCase: true) ? 0 : 1, $index])
            ->take(self::LIMIT)
            ->map($present)
            ->values()
            ->all();
    }

    /**
     * About 140 characters of the first text that contains the term, centred
     * on it; else the start of the first text there is. Null when there's none.
     */
    private function snippet(string $term, ?string ...$texts): ?string
    {
        $texts = array_values(array_filter(array_map(fn (?string $text) => trim(preg_replace('/\s+/', ' ', strip_tags($text ?? ''))), $texts)));
        if ($texts === []) {
            return null;
        }

        foreach ($texts as $text) {
            $at = mb_stripos($text, $term);
            if ($at === false) {
                continue;
            }

            $start = max(0, $at - 50);
            $excerpt = mb_substr($text, $start, self::SNIPPET_LENGTH);

            return ($start > 0 ? '…' : '').$excerpt.($start + self::SNIPPET_LENGTH < mb_strlen($text) ? '…' : '');
        }

        return Str::limit($texts[0], self::SNIPPET_LENGTH, '…');
    }

    private function tagList(?array $tags): ?string
    {
        return $tags ? 'Tags: '.implode(', ', $tags) : null;
    }
}
