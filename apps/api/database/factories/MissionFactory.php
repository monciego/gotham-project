<?php

namespace Database\Factories;

use App\Models\Mission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Mission>
 */
class MissionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => rtrim(fake()->sentence(4), '.'),
            'why_it_matters' => fake()->sentence(),
            'priority' => 'medium',
            'status' => 'not_started',
            'due_date' => now()->toDateString(),
            'estimated_minutes' => fake()->randomElement([25, 50, 90]),
            'energy_required' => 'medium',
        ];
    }

    public function completed(): static
    {
        return $this->state(fn () => ['status' => 'completed', 'completed_at' => now()]);
    }
}
