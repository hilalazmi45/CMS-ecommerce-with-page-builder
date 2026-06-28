import { useForm } from '@inertiajs/react';
import { registerWidget } from '../registry';
import type {
    WidgetDefinition,
    WidgetEditorProps,
    WidgetPreviewProps,
    WidgetSettingsPanelProps,
} from '../types';

// ─── Field definition (stored in settings.fields) ────────────────────────────

interface FormFieldDef {
    label: string;
    name: string;
    type: 'text' | 'email' | 'textarea' | 'tel' | 'select';
    required: boolean;
    options: string; // comma-separated for select type
}

function isFormFieldDef(v: unknown): v is FormFieldDef {
    if (typeof v !== 'object' || v === null) return false;
    const o = v as Record<string, unknown>;
    return (
        typeof o['label'] === 'string' &&
        typeof o['name'] === 'string' &&
        typeof o['type'] === 'string' &&
        typeof o['required'] === 'boolean'
    );
}

function parseFields(raw: unknown): FormFieldDef[] {
    if (!Array.isArray(raw)) return defaultFields;
    return raw.filter(isFormFieldDef);
}

const defaultFields: FormFieldDef[] = [
    { label: 'Name', name: 'name', type: 'text', required: true, options: '' },
    { label: 'Email', name: 'email', type: 'email', required: true, options: '' },
    { label: 'Message', name: 'message', type: 'textarea', required: true, options: '' },
];

// ─── Storefront preview ──────────────────────────────────────────────────────

function Preview({ component }: WidgetPreviewProps) {
    const settings = component.settings;
    const fields = parseFields(settings['fields']);
    const submitLabel = typeof settings['submitLabel'] === 'string' ? settings['submitLabel'] : 'Send';
    const formKey = typeof settings['formKey'] === 'string' ? settings['formKey'] : 'contact';
    const successMessage = typeof settings['successMessage'] === 'string'
        ? settings['successMessage']
        : 'Thank you! Your message has been sent.';

    // Build initial data object for Inertia form
    const initialData: Record<string, string> = { _hp: '' };
    fields.forEach((f) => { initialData[f.name] = ''; });

    const { data, setData, post, processing, errors, wasSuccessful, reset } = useForm<Record<string, string>>(initialData);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/forms/submit?form_key=${encodeURIComponent(formKey)}`, {
            onSuccess: () => reset(),
        });
    };

    if (wasSuccessful) {
        return (
            <div
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700"
            >
                {successMessage}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate aria-label={formKey + ' form'}>
            {/* Honeypot — hidden from real users */}
            <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0" tabIndex={-1}>
                <label htmlFor={`_hp_${component.id}`}>Leave empty</label>
                <input
                    id={`_hp_${component.id}`}
                    type="text"
                    name="_hp"
                    value={data['_hp'] ?? ''}
                    onChange={(e) => setData('_hp', e.target.value)}
                    autoComplete="off"
                    tabIndex={-1}
                />
            </div>

            <div className="space-y-4">
                {fields.map((field) => {
                    const errorMsg = errors[field.name];
                    const inputId = `${component.id}-${field.name}`;
                    const value = data[field.name] ?? '';
                    const onChange = (
                        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
                    ) => setData(field.name, e.target.value);

                    return (
                        <div key={field.name}>
                            <label
                                htmlFor={inputId}
                                className="block text-sm font-medium text-gray-700"
                            >
                                {field.label}
                                {field.required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    id={inputId}
                                    name={field.name}
                                    value={value}
                                    onChange={onChange}
                                    required={field.required}
                                    aria-required={field.required}
                                    aria-describedby={errorMsg ? `${inputId}-error` : undefined}
                                    aria-invalid={errorMsg ? 'true' : undefined}
                                    rows={4}
                                    className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errorMsg ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                                />
                            ) : field.type === 'select' ? (
                                <select
                                    id={inputId}
                                    name={field.name}
                                    value={value}
                                    onChange={onChange}
                                    required={field.required}
                                    aria-required={field.required}
                                    aria-describedby={errorMsg ? `${inputId}-error` : undefined}
                                    aria-invalid={errorMsg ? 'true' : undefined}
                                    className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errorMsg ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                                >
                                    <option value="">Select…</option>
                                    {field.options.split(',').map((opt) => opt.trim()).filter(Boolean).map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    id={inputId}
                                    type={field.type}
                                    name={field.name}
                                    value={value}
                                    onChange={onChange}
                                    required={field.required}
                                    aria-required={field.required}
                                    aria-describedby={errorMsg ? `${inputId}-error` : undefined}
                                    aria-invalid={errorMsg ? 'true' : undefined}
                                    className={`mt-1 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errorMsg ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                                />
                            )}
                            {errorMsg && (
                                <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-red-600">
                                    {errorMsg}
                                </p>
                            )}
                        </div>
                    );
                })}

                <button
                    type="submit"
                    disabled={processing}
                    aria-busy={processing}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
                >
                    {processing ? 'Sending…' : submitLabel}
                </button>
            </div>
        </form>
    );
}

// ─── Editor (canvas) ─────────────────────────────────────────────────────────

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    const settings = component.settings;
    const fields = parseFields(settings['fields']);
    const submitLabel = typeof settings['submitLabel'] === 'string' ? settings['submitLabel'] : 'Send';

    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded p-1 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        >
            <div className="space-y-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Form Widget</p>
                {fields.map((field) => (
                    <div key={field.name}>
                        <div className="mb-1 text-xs font-medium text-gray-600">
                            {field.label}{field.required && <span className="ml-1 text-red-400">*</span>}
                        </div>
                        {field.type === 'textarea' ? (
                            <div className="h-16 rounded border border-gray-200 bg-white" />
                        ) : (
                            <div className="h-8 rounded border border-gray-200 bg-white" />
                        )}
                    </div>
                ))}
                <div className="h-9 rounded bg-blue-200 flex items-center justify-center text-xs text-blue-700 font-semibold">
                    {submitLabel}
                </div>
            </div>
        </div>
    );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const settings = component.settings;
    const fields = parseFields(settings['fields']);
    const submitLabel = typeof settings['submitLabel'] === 'string' ? settings['submitLabel'] : 'Send';
    const formKey = typeof settings['formKey'] === 'string' ? settings['formKey'] : 'contact';
    const successMessage = typeof settings['successMessage'] === 'string'
        ? settings['successMessage']
        : 'Thank you! Your message has been sent.';

    const updateSettings = (patch: Record<string, unknown>) => {
        onChange({ ...settings, ...patch });
    };

    const updateField = (idx: number, patch: Partial<FormFieldDef>) => {
        const updated = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
        updateSettings({ fields: updated });
    };

    const addField = () => {
        updateSettings({
            fields: [
                ...fields,
                { label: 'New Field', name: `field_${fields.length + 1}`, type: 'text', required: false, options: '' },
            ],
        });
    };

    const removeField = (idx: number) => {
        updateSettings({ fields: fields.filter((_, i) => i !== idx) });
    };

    return (
        <div className="space-y-3 p-3">
            <div>
                <label className="block text-xs font-medium text-gray-600">Form key</label>
                <input
                    type="text"
                    value={formKey}
                    onChange={(e) => updateSettings({ formKey: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="contact"
                />
                <p className="mt-0.5 text-[10px] text-gray-400">Identifier for this form in submissions.</p>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600">Submit button label</label>
                <input
                    type="text"
                    value={submitLabel}
                    onChange={(e) => updateSettings({ submitLabel: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-600">Success message</label>
                <textarea
                    value={successMessage}
                    onChange={(e) => updateSettings({ successMessage: e.target.value })}
                    rows={2}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
            </div>

            <div>
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-600">Fields</label>
                    <button
                        type="button"
                        onClick={addField}
                        className="text-[10px] text-blue-600 hover:underline"
                    >
                        + Add field
                    </button>
                </div>
                <div className="mt-2 space-y-3">
                    {fields.map((field, idx) => (
                        <div key={idx} className="rounded border border-gray-200 p-2 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase">Field {idx + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeField(idx)}
                                    className="text-[10px] text-red-500 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                            <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(idx, { label: e.target.value })}
                                placeholder="Label"
                                className="w-full rounded border border-gray-300 px-2 py-0.5 text-xs"
                            />
                            <input
                                type="text"
                                value={field.name}
                                onChange={(e) => updateField(idx, { name: e.target.value })}
                                placeholder="name (no spaces)"
                                className="w-full rounded border border-gray-300 px-2 py-0.5 text-xs"
                            />
                            <select
                                value={field.type}
                                onChange={(e) => updateField(idx, { type: e.target.value as FormFieldDef['type'] })}
                                className="w-full rounded border border-gray-300 px-2 py-0.5 text-xs"
                            >
                                <option value="text">Text</option>
                                <option value="email">Email</option>
                                <option value="tel">Phone</option>
                                <option value="textarea">Textarea</option>
                                <option value="select">Select</option>
                            </select>
                            {field.type === 'select' && (
                                <input
                                    type="text"
                                    value={field.options}
                                    onChange={(e) => updateField(idx, { options: e.target.value })}
                                    placeholder="Option 1, Option 2, …"
                                    className="w-full rounded border border-gray-300 px-2 py-0.5 text-xs"
                                />
                            )}
                            <label className="flex items-center gap-1 text-[10px] text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateField(idx, { required: e.target.checked })}
                                />
                                Required
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Widget definition ────────────────────────────────────────────────────────

const def: WidgetDefinition = {
    type: 'form',
    version: 1,
    category: 'form',
    label: 'Form',
    icon: '📋',
    hasChildren: false,
    defaultSettings: {
        formKey: 'contact',
        submitLabel: 'Send',
        successMessage: 'Thank you! Your message has been sent.',
        fields: defaultFields,
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
