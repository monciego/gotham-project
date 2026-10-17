<?php

namespace Database\Factories;

use App\Models\Intel;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Intel>
 */
class IntelFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'date' => fake()->unique()->dateTimeBetween('-60 days', '-1 day')->format('Y-m-d'),
            'content' => '<p>'.fake()->sentence(12).'</p>',
            'mood' => 'okay',
            'energy_level' => 5,
            'stress_level' => 5,
            'tags' => [],
            'sentiment' => 0,
            'sentiment_label' => 'neutral',
        ];
    }
}
