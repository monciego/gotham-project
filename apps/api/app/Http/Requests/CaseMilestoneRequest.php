<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CaseMilestoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:100'],
            'target_date' => [$required, 'date_format:Y-m-d'],
            'completed' => ['sometimes', 'boolean'],
        ];
    }
}
