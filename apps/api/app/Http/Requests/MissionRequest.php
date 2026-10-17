<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Creating a mission requires the core fields; updating accepts any subset.
 */
class MissionRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'why_it_matters' => [$required, 'string', 'min:10', 'max:2000'],
            'priority' => [$required, Rule::in(['critical', 'high', 'medium', 'low'])],
            'due_date' => [$required, 'date_format:Y-m-d'],
            'due_time' => ['nullable', 'date_format:H:i'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'case_id' => [
                'nullable',
                'integer',
                Rule::exists('cases', 'id')->where('user_id', $this->user()->id)->whereNull('deleted_at'),
            ],
            'energy_required' => [$required, Rule::in(['high', 'medium', 'low'])],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:30', 'distinct'],
            'notes' => ['nullable', 'string', 'max:10000'],
            'past_self_message' => ['nullable', 'string', 'max:2000'],
            // Completing and abandoning have their own endpoints; this only moves between open states.
            'status' => ['sometimes', Rule::in(['not_started', 'in_progress'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'why_it_matters.required' => "Alfred won't let you skip this. Tell him why it matters.",
            'why_it_matters.min' => 'Give it a little more thought: at least :min characters.',
        ];
    }
}
