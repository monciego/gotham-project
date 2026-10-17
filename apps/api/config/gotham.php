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

];
