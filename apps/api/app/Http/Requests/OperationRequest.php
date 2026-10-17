<?php

namespace App\Http\Requests;

use App\Models\Operation;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Creating (POST) or editing (PUT, any subset) an event.
 *
 * Timed events send `start` / `end` as ISO 8601 (without an offset they're
 * read in the user's timezone). All-day events send dates, `end` being the
 * day after the last, as the calendar does. `start`, `end` and `all_day`
 * travel together.
 */
class OperationRequest extends FormRequest
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
        $post = $this->isMethod('POST');
        $times = $post ? 'required' : 'required_with:start,end,all_day';
        $allDay = $this->boolean('all_day', $this->operation()?->all_day ?? false);
        $format = $allDay ? 'date_format:Y-m-d' : 'date';

        return [
            'title' => [$post ? 'required' : 'sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'all_day' => ['sometimes', 'boolean'],
            'start' => [$times, $format],
            'end' => [$times, $format],
            'category' => [$post ? 'required' : 'sometimes', Rule::in(Operation::CATEGORIES)],
            'color' => ['sometimes', 'nullable', Rule::in(Operation::COLORS)],
            'recurring' => ['sometimes', 'boolean'],
            'recurring_rule' => ['nullable', 'array'],
            'recurring_rule.freq' => ['required_if_accepted:recurring', Rule::in(Operation::FREQUENCIES)],
            'recurring_rule.until' => ['nullable', 'date_format:Y-m-d'],
            'reminder_minutes' => ['sometimes', 'nullable', Rule::in(Operation::REMINDERS)],
            'mission_id' => ['sometimes', 'nullable', 'integer', function (string $attribute, mixed $value, Closure $fail) {
                if ($value !== null && ! $this->user()->missions()->whereKey($value)->exists()) {
                    $fail("I can't find that mission, sir.");
                }
            }],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['recurring_rule.freq.required_if_accepted' => 'How often does it repeat, sir?'];
    }

    /** @return array<int, Closure> */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty() || ! $this->has('start')) {
                return;
            }

            ['start_time' => $start, 'end_time' => $end] = $this->times();
            if ($end->lte($start)) {
                $validator->errors()->add('end', 'It has to end after it starts, sir.');
            }

            $until = $this->input('recurring_rule.until');
            if ($until && $until < $start->setTimezone($this->user()->timezone)->toDateString()) {
                $validator->errors()->add('recurring_rule.until', 'The repeats must end after the first one, sir.');
            }
        }];
    }

    /**
     * The validated fields as columns: times in UTC, the rule cleared for
     * one-off events.
     *
     * @return array<string, mixed>
     */
    public function operationData(): array
    {
        $data = collect($this->validated())->except(['start', 'end'])->all();

        if ($this->has('start')) {
            $data = [...$data, ...$this->times()];
        }
        if (array_key_exists('recurring', $data) && ! $data['recurring']) {
            $data['recurring_rule'] = null;
        }

        return $data;
    }

    /** @return array{start_time: CarbonImmutable, end_time: CarbonImmutable} */
    private function times(): array
    {
        $tz = $this->user()->timezone;
        $allDay = $this->boolean('all_day', $this->operation()?->all_day ?? false);
        $parse = fn (string $value) => $allDay
            ? CarbonImmutable::parse($value, $tz)->startOfDay()->utc()
            : CarbonImmutable::parse($value, $tz)->utc();

        return ['start_time' => $parse($this->input('start')), 'end_time' => $parse($this->input('end'))];
    }

    private function operation(): ?Operation
    {
        $id = $this->route('operation');

        return $id === null ? null : $this->user()->operations()->find($id);
    }
}
