<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Domain\PageBuilder\Support\BuilderDocument;
use App\Domain\PageBuilder\Support\PageSchemaValidator;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates a page-builder save payload at the trust boundary.
 *
 * Authorisation mirrors BuilderController exactly (via the shared
 * BuilderDocument helper) and runs before validation. Structural validation
 * of the builder schema — nesting depth, component count, per-component shape
 * — is delegated to the pure PageSchemaValidator.
 */
class SaveBuilderContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $type = (string) $this->route('type');
        $ulid = (string) $this->route('ulid');

        // Resolves the owner or throws 404 for an unknown type / missing record,
        // matching the controller's previous ordering (resolve, then authorize).
        $owner = BuilderDocument::resolve($type, $ulid);

        [$ability, $target] = BuilderDocument::gateArguments($type, $owner);

        return (bool) $this->user()?->can($ability, $target);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'content' => ['required', 'array'],
            'content.schemaVersion' => ['required', 'integer'],
            'content.components' => ['present', 'array'],
            'publish' => ['boolean'],
            'label' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Enforce the deep structural invariants (depth, count, per-component shape)
     * that simple array rules cannot express.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $content = $this->input('content');

            if (! is_array($content)) {
                return; // the base `content` rule already reported this
            }

            foreach ((new PageSchemaValidator)->validate($content) as $error) {
                $validator->errors()->add('content', $error);
            }
        });
    }
}
