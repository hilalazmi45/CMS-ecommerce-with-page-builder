import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from '../hooks/usePermissions';

vi.mock('@inertiajs/react', () => ({
    usePage: vi.fn(),
}));

import { usePage } from '@inertiajs/react';

const mockPage = (permissions: string[], roles: string[], isSuperAdmin: boolean) => {
    vi.mocked(usePage).mockReturnValue({
        props: {
            auth: { user: null, permissions, roles, isSuperAdmin },
            flash: {},
            ziggy: { location: '/', url: '/', port: null, defaults: {}, routes: {} },
        },
    } as ReturnType<typeof usePage>);
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('usePermissions', () => {
    describe('can()', () => {
        it('returns true when permission is in the list', () => {
            mockPage(['user.view_all', 'role.create'], [], false);
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('user.view_all')).toBe(true);
        });

        it('returns false when permission is not in the list', () => {
            mockPage(['user.view_all'], [], false);
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('role.create')).toBe(false);
        });

        it('returns true for any permission when isSuperAdmin is true', () => {
            mockPage([], [], true);
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('any.obscure.permission')).toBe(true);
        });

        it('returns false for empty permissions list and non-super-admin', () => {
            mockPage([], [], false);
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('user.create')).toBe(false);
        });
    });

    describe('hasRole()', () => {
        it('returns true when role slug is in the list', () => {
            mockPage([], ['editor', 'store_manager'], false);
            const { result } = renderHook(() => usePermissions());
            expect(result.current.hasRole('editor')).toBe(true);
        });

        it('returns false when role slug is not in the list', () => {
            mockPage([], ['editor'], false);
            const { result } = renderHook(() => usePermissions());
            expect(result.current.hasRole('super_administrator')).toBe(false);
        });
    });

    describe('isSuperAdmin', () => {
        it('reflects the page prop value', () => {
            mockPage([], ['super_administrator'], true);
            const { result } = renderHook(() => usePermissions());
            expect(result.current.isSuperAdmin).toBe(true);
        });

        it('is false for regular users', () => {
            mockPage(['user.view_all'], ['editor'], false);
            const { result } = renderHook(() => usePermissions());
            expect(result.current.isSuperAdmin).toBe(false);
        });
    });
});
