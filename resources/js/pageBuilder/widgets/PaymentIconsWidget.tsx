import { registerWidget } from '../registry';
import type { WidgetDefinition, WidgetEditorProps, WidgetPreviewProps, WidgetSettingsPanelProps } from '../types';

// Built-in placeholder icons for common Malaysian payment methods
const METHOD_LABELS: Record<string, string> = {
    visa: 'VISA',
    mastercard: 'MC',
    fpx: 'FPX',
    grabpay: 'GrabPay',
    tng: 'TNG',
    maybank: 'Maybank',
    cimb: 'CIMB',
    cod: 'COD',
    installment: 'Instalment',
};

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
    visa: { bg: '#1a1f71', text: '#ffffff' },
    mastercard: { bg: '#eb001b', text: '#ffffff' },
    fpx: { bg: '#007bff', text: '#ffffff' },
    grabpay: { bg: '#00b14f', text: '#ffffff' },
    tng: { bg: '#ff6600', text: '#ffffff' },
    maybank: { bg: '#ffcc00', text: '#333333' },
    cimb: { bg: '#cf102d', text: '#ffffff' },
    cod: { bg: '#555555', text: '#ffffff' },
    installment: { bg: '#0067b8', text: '#ffffff' },
};

function Preview({ component }: WidgetPreviewProps) {
    const methods = (component.settings.methods ?? Object.keys(METHOD_LABELS)) as string[];

    return (
        <div className="wd-payment-icons flex flex-wrap items-center gap-2">
            {methods.map((method) => {
                const colors = METHOD_COLORS[method] ?? { bg: '#888', text: '#fff' };
                return (
                    <span
                        key={method}
                        className="inline-flex items-center justify-center rounded px-2 py-1 text-xs font-bold"
                        style={{ backgroundColor: colors.bg, color: colors.text, minWidth: '48px' }}
                        title={METHOD_LABELS[method] ?? method}
                    >
                        {METHOD_LABELS[method] ?? method}
                    </span>
                );
            })}
        </div>
    );
}

function Editor({ component, isSelected, onSelect }: WidgetEditorProps) {
    return (
        <div onClick={onSelect} className={`cursor-pointer rounded p-2 ${isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}>
            <Preview component={component} />
        </div>
    );
}

function SettingsPanel({ component, onChange }: WidgetSettingsPanelProps) {
    const methods = (component.settings.methods ?? Object.keys(METHOD_LABELS)) as string[];
    const allMethods = Object.keys(METHOD_LABELS);

    function toggleMethod(method: string) {
        const updated = methods.includes(method)
            ? methods.filter((m) => m !== method)
            : [...methods, method];
        onChange({ ...component.settings, methods: updated });
    }

    return (
        <div className="space-y-2 p-3">
            <label className="block text-xs font-medium text-gray-600">Payment Methods</label>
            <div className="flex flex-wrap gap-2">
                {allMethods.map((method) => (
                    <label key={method} className="flex cursor-pointer items-center gap-1">
                        <input
                            type="checkbox"
                            checked={methods.includes(method)}
                            onChange={() => toggleMethod(method)}
                            className="rounded"
                        />
                        <span className="text-xs text-gray-700">{METHOD_LABELS[method]}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

const def: WidgetDefinition = {
    type: 'payment-icons',
    version: 1,
    category: 'layout',
    label: 'Payment Icons',
    icon: '💳',
    hasChildren: false,
    defaultSettings: {
        methods: ['visa', 'mastercard', 'fpx', 'grabpay', 'tng', 'maybank', 'cimb', 'cod', 'installment'],
    },
    defaultStyles: { desktop: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    SettingsPanel,
};

registerWidget(def);
export default def;
