import type { Permission } from '@/types';

interface Props {
    permissionGroups: Record<string, Record<string, string>>;
    permissions: Permission[];
    selectedIds: number[];
    onChange?: (ids: number[]) => void;
    readonly?: boolean;
}

export default function PermissionMatrix({ permissionGroups, permissions, selectedIds, onChange, readonly = false }: Props) {
    function codeToId(code: string): number | undefined {
        return permissions.find((p) => p.code === code)?.id;
    }

    function isChecked(code: string): boolean {
        const id = codeToId(code);
        return id !== undefined && selectedIds.includes(id);
    }

    function toggle(code: string) {
        if (readonly || !onChange) return;
        const id = codeToId(code);
        if (id === undefined) return;
        onChange(
            selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
        );
    }

    function toggleGroup(module: string) {
        if (readonly || !onChange) return;
        const codes = Object.keys(permissionGroups[module] ?? {});
        const ids = codes.map(codeToId).filter((id): id is number => id !== undefined);
        const allChecked = ids.every((id) => selectedIds.includes(id));
        if (allChecked) {
            onChange(selectedIds.filter((id) => !ids.includes(id)));
        } else {
            const next = new Set([...selectedIds, ...ids]);
            onChange([...next]);
        }
    }

    function groupAllChecked(module: string): boolean {
        const codes = Object.keys(permissionGroups[module] ?? {});
        return codes.every((code) => isChecked(code));
    }

    return (
        <div className="divide-y divide-gray-100">
            {Object.entries(permissionGroups).map(([module, codes]) => (
                <div key={module} className="py-4">
                    <label className="mb-2 flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={groupAllChecked(module)}
                            disabled={readonly}
                            onChange={() => toggleGroup(module)}
                            className="rounded border-gray-300 text-indigo-600 disabled:opacity-50"
                        />
                        <span className="text-sm font-semibold capitalize text-gray-800">{module}</span>
                    </label>
                    <div className="ml-6 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                        {Object.entries(codes).map(([code, description]) => (
                            <label key={code} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isChecked(code)}
                                    disabled={readonly}
                                    onChange={() => toggle(code)}
                                    className="rounded border-gray-300 text-indigo-600 disabled:opacity-50"
                                />
                                <span className="text-xs text-gray-600">{description}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
