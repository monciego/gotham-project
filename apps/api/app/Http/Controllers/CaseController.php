<?php

namespace App\Http\Controllers;

use App\Models\CaseFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Only what the mission form needs for now: the user's open cases.
 */
class CaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cases = $request->user()->cases()->open()->orderBy('name')->get()
            ->map(fn (CaseFile $case) => [
                'id' => $case->id,
                'name' => $case->name,
                'status' => $case->status,
                'color' => $case->color,
                'progress' => $case->progress,
            ]);

        return $this->success($cases);
    }
}
