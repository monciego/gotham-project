<?php

namespace App\Http\Resources;

use App\Models\AlfredMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin AlfredMessage */
class AlfredMessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'priority' => $this->priority,
            'mood' => $this->mood,
            'title' => $this->title,
            'message' => $this->message,
            'actions' => $this->actions ?? [],
            'requires_action' => $this->requires_action,
            'action_taken' => $this->action_taken,
            'read_at' => $this->read_at,
            'dismissed_at' => $this->dismissed_at,
            'created_at' => $this->created_at,
        ];
    }
}
