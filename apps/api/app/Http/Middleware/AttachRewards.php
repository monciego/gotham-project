<?php

namespace App\Http\Middleware;

use App\Support\Rewards;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Adds what the request earned (App\Support\Rewards) to successful JSON responses as `rewards`. */
class AttachRewards
{
    public function __construct(private Rewards $rewards) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->rewards->reset();
        $response = $next($request);

        if ($response instanceof JsonResponse && $response->isSuccessful() && ! $this->rewards->isEmpty()) {
            $data = $response->getData(true);
            if (is_array($data)) {
                $response->setData([...$data, 'rewards' => $this->rewards->toArray()]);
            }
        }

        return $response;
    }
}
