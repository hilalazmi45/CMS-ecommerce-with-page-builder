<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Domain\Cms\Models\CmsPage;
use App\Domain\PageBuilder\Models\ThemeTemplate;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ThemeTemplateController extends Controller
{
    public function index(): Response
    {
        // Re-use the cms.update permission — theme templates live in the same Content group.
        $this->authorize('update', CmsPage::firstOrNew());

        $templates = ThemeTemplate::orderBy('type')->orderBy('name')->get()
            ->map(fn (ThemeTemplate $t) => [
                'ulid' => $t->ulid,
                'name' => $t->name,
                'type' => $t->type,
                'is_active' => $t->is_active,
                'conditions' => $t->conditions ?? [],
                'updateConditionsUrl' => route('admin.theme-templates.update-conditions', $t->ulid),
                'editUrl' => route('admin.builder.edit', [$t->type, $t->ulid]),
            ]);

        return Inertia::render('Admin/ThemeTemplates/Index', [
            'templates' => $templates,
        ]);
    }

    /**
     * PATCH /admin/theme-templates/{themeTemplate:ulid}/conditions
     *
     * Accepts an array of condition objects and saves them to the template.
     * Each condition: { mode: 'include'|'exclude', rule: string }
     *
     * Allowed rule prefixes / values:
     *   entire_site
     *   front_page
     *   e404
     *   singular:product[:<id>]
     *   singular:cms_page[:<id>]
     *   archive:product_category[:<id>]
     *   archive:product_brand[:<id>]
     */
    public function updateConditions(Request $request, ThemeTemplate $themeTemplate): RedirectResponse
    {
        $this->authorize('update', CmsPage::firstOrNew());

        $validated = $request->validate([
            'conditions' => ['required', 'array'],
            'conditions.*.mode' => ['required', 'string', 'in:include,exclude'],
            'conditions.*.rule' => [
                'required',
                'string',
                'max:120',
                'regex:/^(entire_site|front_page|e404|(singular|archive):(product|cms_page|product_category|product_brand)(:\d+)?)$/',
            ],
        ]);

        $themeTemplate->update(['conditions' => $validated['conditions']]);

        return redirect()
            ->route('admin.theme-templates.index')
            ->with('success', 'Display conditions saved.');
    }
}
