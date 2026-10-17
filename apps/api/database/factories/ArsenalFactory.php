<?php

namespace Database\Factories;

use App\Models\Arsenal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Arsenal>
 */
class ArsenalFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => ucfirst(fake()->words(2, true)),
            'category' => fake()->randomElement(Arsenal::CATEGORIES),
            'type' => 'daily',
            'frequency' => [],
            'active' => true,
        ];
    }
}
