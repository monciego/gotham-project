<?php

namespace App\Http\Resources;

use App\Models\Intel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** @mixin Intel */
class IntelResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date->toDateString(),
            'content' => $this->content,
            // The first 100 characters of the text, for list cards.
            'excerpt' => Str::limit($this->plainContent(), 100),
            'mood' => $this->mood,
            'energy_level' => $this->energy_level,
            'stress_level' => $this->stress_level,
            'gratitude' => $this->gratitude,
            'wins' => $this->wins,
            'struggles' => $this->struggles,
            'tags' => $this->tags ?? [],
            'sentiment' => $this->sentiment === null ? null : (float) $this->sentiment,
            'sentiment_label' => $this->sentiment_label,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
