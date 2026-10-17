<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A Trophy definition. Rows come from AchievementsSeeder.
 */
#[Fillable(['key', 'name', 'description', 'category', 'rarity', 'criteria', 'xp_reward'])]
class Achievement extends Model
{
    protected function casts(): array
    {
        return [
            'criteria' => 'array',
            'xp_reward' => 'integer',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_achievements')
            ->using(UserAchievement::class)
            ->withPivot('earned_at');
    }

    public function scopeCategory(Builder $query, string $category): void
    {
        $query->where('category', $category);
    }

    public function scopeRarity(Builder $query, string $rarity): void
    {
        $query->where('rarity', $rarity);
    }
}
