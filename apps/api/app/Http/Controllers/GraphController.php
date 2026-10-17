<?php

namespace App\Http\Controllers;

use App\Services\GothamGraph;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** The Gotham Map (App\Services\GothamGraph). */
class GraphController extends Controller
{
    /**
     * `types[]` (case, mission, arsenal, intel; default all), `status[]` for
     * missions (default open ones), `show_completed` (completed missions and
     * cases; default false) and `days` of Intel (default 30).
     */
    public function index(Request $request, GothamGraph $graph): JsonResponse
    {
        $filters = $request->validate([
            'types' => ['sometimes', 'array'],
            'types.*' => [Rule::in(GothamGraph::TYPES)],
            'status' => ['sometimes', 'array'],
            'status.*' => [Rule::in(['not_started', 'in_progress', 'completed', 'abandoned'])],
            'show_completed' => ['sometimes', 'boolean'],
            'days' => ['sometimes', 'integer', 'min:1', 'max:366'],
        ]);

        return $this->success($graph->build($request->user(), [
            ...$filters,
            'show_completed' => $request->boolean('show_completed'),
            'days' => (int) ($filters['days'] ?? 30),
        ]));
    }
}
