<?php

namespace Database\Factories;

use App\Models\Resource;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<resource>
 */
class ResourceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => 'expense',
            'amount' => fake()->randomFloat(2, 5, 200),
            'category' => 'Food',
            'description' => fake()->words(3, true),
            'date' => now()->toDateString(),
            'recurring' => false,
        ];
    }

    public function income(): static
    {
        return $this->state(['type' => 'income', 'category' => 'Salary']);
    }
}
