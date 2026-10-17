<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(AchievementsSeeder::class);

        // Sign in locally as test@example.com / password.
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            User::factory()->make(['name' => 'Bruce Wayne'])->only(['name', 'password', 'email_verified_at']),
        );

        if (app()->environment('local')) {
            $this->call(DemoSeeder::class);
            // A second account, graph@example.com, for the Gotham Map.
            $this->call(GraphDemoSeeder::class);
        }
    }
}
