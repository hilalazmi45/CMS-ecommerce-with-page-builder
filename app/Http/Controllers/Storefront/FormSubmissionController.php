<?php

declare(strict_types=1);

namespace App\Http\Controllers\Storefront;

use App\Domain\Cms\Models\FormSubmission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\StoreFormSubmissionRequest;
use Illuminate\Http\RedirectResponse;

class FormSubmissionController extends Controller
{
    public function store(StoreFormSubmissionRequest $request): RedirectResponse
    {
        // Honeypot check — validated by rule, but double-check explicitly.
        if (filled($request->input('_hp'))) {
            return back()->with('success', true);
        }

        $validated = $request->validated();

        /** @var array<string, string|null> $fields */
        $fields = $validated['fields'];

        FormSubmission::create([
            'form_key' => $validated['form_key'],
            'payload' => $fields,
            'ip_address' => $request->ip(),
        ]);

        // TODO B6: queue a FormSubmissionNotificationMail to admin when mail is configured.

        return back()->with('success', true);
    }
}
