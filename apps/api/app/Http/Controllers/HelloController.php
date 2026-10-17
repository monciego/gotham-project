<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class HelloController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return $this->success(message: 'Good evening, sir. Gotham awaits.');
    }
}
