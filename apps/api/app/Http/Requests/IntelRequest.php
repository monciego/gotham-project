<?php

namespace App\Http\Requests;

use App\Models\Intel;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Creating (POST, all core fields required) or editing (PUT, any subset) an entry. */
class IntelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_array($this->input('tags'))) {
            $this->merge([
                'tags' => collect($this->input('tags'))
                    ->filter(fn ($tag) => is_string($tag))
                    ->map(fn (string $tag) => trim($tag))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all(),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';
        $user = $this->user();

        return [
            'date' => [
                $required,
                'date_format:Y-m-d',
                'before_or_equal:'.$user->today()->toDateString(),
                // whereDate, not Rule::unique: SQLite stores dates with a time.
                function (string $attribute, mixed $value, Closure $fail) use ($user) {
                    $taken = $user->intel()
                        ->whereDate('date', $value)
                        ->when($this->route('intel'), fn ($query, $id) => $query->whereKeyNot($id))
                        ->exists();

                    if ($taken) {
                        $fail("You've already filed Intel for that day, sir. Edit that entry instead.");
                    }
                },
            ],
            'content' => [$required, 'string', 'max:100000'],
            'mood' => [$required, Rule::in(Intel::MOODS)],
            'energy_level' => [$required, 'integer', 'between:1,10'],
            'stress_level' => [$required, 'integer', 'between:1,10'],
            'gratitude' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'wins' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'struggles' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'tags' => ['sometimes', 'nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:30'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'date.before_or_equal' => "Intel can't be filed for days that haven't happened yet, sir.",
            'mood.required' => 'How was the day, sir?',
        ];
    }
}
