<?php

declare(strict_types=1);

namespace App\Http\Requests\Storefront;

use Illuminate\Foundation\Http\FormRequest;

class StoreFormSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'form_key' => ['required', 'string', 'max:100', 'alpha_dash'],
            'fields' => ['required', 'array', 'min:1', 'max:30'],
            'fields.*' => ['present', 'nullable', 'string', 'max:2000'],
            // Honeypot — validated as an ordinary nullable string so the
            // response is indistinguishable from a normal request. The
            // controller silently discards any submission where _hp is filled.
            '_hp' => ['nullable', 'string', 'max:255'],
        ];
    }
}
