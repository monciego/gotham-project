<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SavingsGoalRequest extends FormRequest
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
            'target_amount' => [$required, 'numeric', 'decimal:0,2', 'min:1', 'max:9999999999.99'],
            'deadline' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:'.$this->user()->today()->toDateString()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['deadline.after_or_equal' => 'A deadline in the future, sir.'];
    }
}
