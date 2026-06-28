import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

export function usePermissions() {
    const { auth } = usePage<PageProps>().props;

    function can(permission: string): boolean {
        if (auth.isSuperAdmin) return true;
        return auth.permissions.includes(permission);
    }

    function hasRole(roleSlug: string): boolean {
        return auth.roles.includes(roleSlug);
    }

    return { can, hasRole, isSuperAdmin: auth.isSuperAdmin };
}
