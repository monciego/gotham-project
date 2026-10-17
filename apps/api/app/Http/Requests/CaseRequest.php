<?php

namespace App\Http\Requests;

use App\Models\CaseFile;
use App\Support\RichText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Opening a case requires a name and a start date; updating accepts any subset.
 * `notes` is HTML from the web editor and is cleaned before saving.
 */
class CaseRequest extends FormRequest
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
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(CaseFile::EDITABLE_STATUSES)],
            'category' => ['sometimes', 'nullable', 'string', 'max:50'],
            'start_date' => [$required, 'date_format:Y-m-d'],
            'target_end_date' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'progress_mode' => ['sometimes', Rule::in(['auto', 'manual'])],
            'color' => ['sometimes', 'nullable', Rule::in(CaseFile::COLORS)],
            'tags' => ['sometimes', 'nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:30', 'distinct'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:50000'],
        ];
    }

    /** The target can't come before the start, counting the saved dates on updates. */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $existing = $this->isMethod('POST') ? null : $this->user()->cases()->find((int) $this->route('case'));
                $start = $this->input('start_date') ?? $existing?->start_date?->toDateString();
                $target = $this->exists('target_end_date')
                    ? $this->input('target_end_date')
                    : $existing?->target_end_date?->toDateString();

                if ($start !== null && $target !== null && $target < $start) {
                    $validator->errors()->add('target_end_date', "The target can't come before the start, sir.");
                }
            },
        ];
    }

    /** @return array<string, mixed> */
    public function caseData(): array
    {
        $data = $this->validated();

        if (array_key_exists('notes', $data)) {
            $notes = $data['notes'] === null ? '' : RichText::clean($data['notes']);
            $data['notes'] = trim(strip_tags($notes)) === '' ? null : $notes;
        }

        if (array_key_exists('tags', $data)) {
            $data['tags'] ??= [];
        }

        return $data;
    }
}
