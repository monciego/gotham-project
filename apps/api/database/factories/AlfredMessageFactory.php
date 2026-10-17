<?php

namespace Database\Factories;

use App\Models\AlfredMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AlfredMessage>
 */
class AlfredMessageFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'priority' => 'medium',
            'mood' => 'encouraging',
            'title' => fake()->sentence(3),
            'message' => fake()->sentence(),
        ];
    }
}
