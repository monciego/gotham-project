<?php

namespace App\Http\Requests;

use App\Models\Arsenal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Creating (POST, core fields required) or editing (PUT, any subset) a habit. */
class ArsenalRequest extends FormRequest
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
        // Frequency rules follow the type being saved: the new one, or the habit's current one.
        $type = $this->input('type', $this->habit()?->type);

        return [
            'name' => [$required, 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'category' => [$required, Rule::in(Arsenal::CATEGORIES)],
            'type' => [$required, Rule::in(Arsenal::TYPES)],
            'frequency' => ['sometimes', 'nullable', 'array'],
            'frequency.times' => [Rule::requiredIf($type === 'weekly' && $this->has('type')), 'integer', 'between:1,7'],
            'frequency.days' => [Rule::requiredIf($type === 'specific_days' && $this->has('type')), 'array', 'min:1'],
            'frequency.days.*' => ['integer', 'between:1,7', 'distinct'],
            'frequency.every' => [Rule::requiredIf($type === 'interval' && $this->has('type')), 'integer', 'between:1,365'],
            'target_value' => [Rule::requiredIf($type === 'measurable' && $this->has('type')), 'nullable', 'integer', 'min:1', 'max:1000000'],
            'unit' => [Rule::requiredIf($type === 'measurable' && $this->has('type')), 'nullable', 'string', 'max:30'],
            'reminder_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'mode_specific' => ['sometimes', 'nullable', 'array'],
            'mode_specific.*' => [Rule::in(Arsenal::MODES), 'distinct'],
            'active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'frequency.times.required' => 'How many times a week, sir?',
            'frequency.days.required' => 'Choose at least one day, sir.',
            'frequency.every.required' => 'Every how many days, sir?',
            'target_value.required' => 'A target, sir. Otherwise how will we know?',
            'unit.required' => 'Pages, glasses, minutes? Give it a unit, sir.',
        ];
    }

    /**
     * The validated fields ready to save: frequency trimmed to the type, and
     * target and unit cleared for types that don't use them.
     *
     * @return array<string, mixed>
     */
    public function habitData(): array
    {
        $data = $this->validated();
        $type = $data['type'] ?? $this->habit()?->type;

        if (array_key_exists('type', $data) || array_key_exists('frequency', $data)) {
            $data['frequency'] = Arsenal::normalizeFrequency($type, $data['frequency'] ?? $this->habit()?->frequency);
        }
        if ($type !== 'measurable' && array_key_exists('type', $data)) {
            $data['target_value'] = null;
            $data['unit'] = null;
        }

        return $data;
    }

    private function habit(): ?Arsenal
    {
        $id = $this->route('arsenal');

        return $id === null ? null : $this->user()->arsenal()->find($id);
    }
}
