<?php

return [

    'arsenal' => [

        /*
        | Missed days in a row (weeks, for weekly habits) that don't break a
        | streak, by the user's current mode. Modes not listed get none.
        */
        'grace' => [
            'bruce' => (int) env('ARSENAL_GRACE_BRUCE', 1),
            'rest' => (int) env('ARSENAL_GRACE_REST', 2),
        ],

    ],

    'alfred' => [

        /*
        | How hard Alfred pushes, by the user's alfred_aggressiveness:
        | - no_start_hour: local hour after which "you haven't started" fires
        | - avoidance_postponements: postponements before a mission counts as avoided
        */
        'aggressiveness' => [
            'mild' => ['no_start_hour' => 12, 'avoidance_postponements' => 4],
            'normal' => ['no_start_hour' => 10, 'avoidance_postponements' => 3],
            'intense' => ['no_start_hour' => 9, 'avoidance_postponements' => 2],
        ],

    ],

];
