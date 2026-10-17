<?php

namespace App\Support;

/**
 * What the current request earned: XP changes, a level change and trophies.
 * App\Http\Middleware\AttachRewards adds it to successful JSON responses as
 * `rewards`, so the web can celebrate whatever caused it, from any endpoint.
 * A singleton (AppServiceProvider) that the middleware clears as each request starts.
 */
class Rewards
{
    /** @var list<array{amount: int, reason: string, label: string|null}> */
    private array $xp = [];

    /** @var array{from: int, to: int}|null */
    private ?array $level = null;

    /** @var list<array<string, mixed>> */
    private array $trophies = [];

    public function xp(int $amount, string $reason, ?string $label, int $levelBefore, int $levelAfter): void
    {
        $this->xp[] = ['amount' => $amount, 'reason' => $reason, 'label' => $label];

        if ($levelAfter !== $levelBefore) {
            // Several awards in one request make one level change, from the first level to the last.
            $this->level = ['from' => $this->level['from'] ?? $levelBefore, 'to' => $levelAfter];
        }
    }

    /** @param  array<string, mixed>  $trophy  As App\Services\AchievementService::award() returns it. */
    public function trophy(array $trophy): void
    {
        $this->trophies[] = $trophy;
    }

    public function reset(): void
    {
        $this->xp = [];
        $this->level = null;
        $this->trophies = [];
    }

    public function isEmpty(): bool
    {
        return $this->xp === [] && $this->trophies === [];
    }

    /**
     * @return array{xp: list<array{amount: int, reason: string, label: string|null}>, xp_total: int, level_up: array{from: int, to: int}|null, trophies: list<array<string, mixed>>}
     */
    public function toArray(): array
    {
        return [
            'xp' => $this->xp,
            'xp_total' => array_sum(array_column($this->xp, 'amount')),
            // Only rises are celebrated.
            'level_up' => $this->level !== null && $this->level['to'] > $this->level['from'] ? $this->level : null,
            'trophies' => $this->trophies,
        ];
    }
}
