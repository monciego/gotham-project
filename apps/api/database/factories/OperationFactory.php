<?php

namespace Database\Factories;

use App\Models\Operation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Operation>
 */
class OperationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = now()->startOfHour()->addDay();

        return [
            'user_id' => User::factory(),
            'title' => ucfirst(fake()->words(3, true)),
            'start_time' => $start,
            'end_time' => $start->copy()->addHour(),
            'category' => 'work',
        ];
    }
}
