<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Shared\Services\ActivityLogger;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DesignSystemController extends Controller
{
    public function show(): Response
    {
        $this->authorize('viewAny', Setting::class);

        return Inertia::render('Admin/Settings/DesignSystem', [
            'colors' => Setting::get('design_system', 'ds_colors', []),
            'typography' => Setting::get('design_system', 'ds_typography', []),
            'spacing' => Setting::get('design_system', 'ds_spacing', []),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $this->authorize('update', Setting::class);

        $data = $request->validate([
            'colors' => ['present', 'array', 'max:20'],
            'colors.*.key' => ['required', 'string', 'max:50', 'regex:/^[a-z0-9_-]+$/'],
            'colors.*.name' => ['required', 'string', 'max:60'],
            'colors.*.value' => ['required', 'string', 'max:30'],
            'typography' => ['present', 'array'],
            'typography.*.key' => ['required', 'string', 'max:30'],
            'typography.*.label' => ['required', 'string', 'max:60'],
            'typography.*.fontFamily' => ['nullable', 'string', 'max:100'],
            'typography.*.fontSize' => ['nullable', 'string', 'max:20'],
            'typography.*.fontWeight' => ['nullable', 'string', 'max:10'],
            'typography.*.lineHeight' => ['nullable', 'string', 'max:20'],
            'spacing' => ['present', 'array', 'max:10'],
            'spacing.*.key' => ['required', 'string', 'max:30'],
            'spacing.*.label' => ['required', 'string', 'max:60'],
            'spacing.*.value' => ['required', 'string', 'max:20'],
        ]);

        $old = [
            'colors' => Setting::get('design_system', 'ds_colors', []),
            'typography' => Setting::get('design_system', 'ds_typography', []),
            'spacing' => Setting::get('design_system', 'ds_spacing', []),
        ];

        Setting::set('design_system', 'ds_colors', $data['colors'], 'json', true);
        Setting::set('design_system', 'ds_typography', $data['typography'], 'json', true);
        Setting::set('design_system', 'ds_spacing', $data['spacing'], 'json', true);

        ActivityLogger::log('design_system', 'updated', Setting::class, null, $old, $data);

        return redirect()->back()->with('success', 'Design system saved.');
    }
}
