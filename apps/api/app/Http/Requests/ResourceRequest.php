<?php

namespace App\Http\Requests;

use App\Models\Resource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Creating (POST, core fields required) or editing (PUT, any subset) a transaction. */
class ResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['category', 'description', 'account'] as $field) {
            if (is_string($this->input($field))) {
                $this->merge([$field => preg_replace('/\s+/', ' ', trim($this->input($field)))]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'type' => [$required, Rule::in(['income', 'expense'])],
            'amount' => [$required, 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
            'category' => [$required, 'string', 'max:50'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'date' => [$required, 'date_format:Y-m-d'],
            'account' => ['sometimes', 'nullable', 'string', 'max:50'],
            'recurring' => ['sometimes', 'boolean'],
            'recurring_frequency' => ['nullable', 'required_if_accepted:recurring', Rule::in(Resource::FREQUENCIES)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.min' => 'An amount above zero, sir.',
            'amount.decimal' => 'Dollars and cents only, sir: at most two decimals.',
            'recurring_frequency.required_if_accepted' => 'How often does it repeat, sir?',
        ];
    }

    /**
     * Validated data, with the frequency cleared for one-off transactions.
     *
     * @return array<string, mixed>
     */
    public function resourceData(): array
    {
        $data = $this->validated();
        if (array_key_exists('recurring', $data) && ! $data['recurring']) {
            $data['recurring_frequency'] = null;
        }

        return $data;
    }
}
