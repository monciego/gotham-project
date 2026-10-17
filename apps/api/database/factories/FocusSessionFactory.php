<?php

namespace Database\Factories;

use App\Models\FocusSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FocusSession>
 */
class FocusSessionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = now()->subHour();

        return [
            'user_id' => User::factory(),
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes(25),
            'duration_minutes' => 25,
            'completed' => true,
        ];
    }
}
