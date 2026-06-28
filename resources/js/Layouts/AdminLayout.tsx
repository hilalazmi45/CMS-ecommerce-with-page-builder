import { Link, usePage } from '@inertiajs/react';
import { usePermissions } from '@/hooks/usePermissions';
import type { PageProps } from '@/types';
import {
    LayoutDashboard,
    Users,
    Shield,
    Settings,
    Image,
    ShoppingBag,
    Tag,
    Package,
    Ticket,
    FileText,
    LayoutTemplate,
    LogOut,
    ChevronDown,
    MessageSquare,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface NavItem {
    label: string;
    href: string;
    icon: ReactNode;
    permission?: string;
}

interface NavGroup {
    group: string;
    items: NavItem[];
}

export default function AdminLayout({ children, title }: { children: ReactNode; title?: string }) {
    const { auth, flash } = usePage<PageProps>().props;
    const { can } = usePermissions();
    const currentUrl = usePage().url;
    const [userMenu, setUserMenu] = useState(false);

    const navGroups: NavGroup[] = [
        {
            group: 'Platform',
            items: [
                { label: 'Dashboard', href: route('admin.dashboard'), icon: <LayoutDashboard size={17} /> },
                { label: 'Users', href: route('admin.users.index'), icon: <Users size={17} />, permission: 'user.view_all' },
                { label: 'Roles', href: route('admin.roles.index'), icon: <Shield size={17} />, permission: 'role.view_all' },
                { label: 'Media', href: route('admin.media.index'), icon: <Image size={17} />, permission: 'media.view' },
                { label: 'Settings', href: route('admin.settings.index'), icon: <Settings size={17} />, permission: 'settings.view' },
            ],
        },
        {
            group: 'Commerce',
            items: [
                { label: 'Products', href: route('admin.products.index'), icon: <ShoppingBag size={17} />, permission: 'catalogue.view' },
                { label: 'Categories', href: route('admin.product-categories.index'), icon: <Tag size={17} />, permission: 'catalogue.manage_categories' },
                { label: 'Brands', href: route('admin.product-brands.index'), icon: <Tag size={17} />, permission: 'catalogue.manage_brands' },
                { label: 'Orders', href: route('admin.orders.index'), icon: <Package size={17} />, permission: 'order.view_all' },
                { label: 'Customers', href: route('admin.customers.index'), icon: <Users size={17} />, permission: 'customer.view_all' },
                { label: 'Coupons', href: route('admin.coupons.index'), icon: <Ticket size={17} />, permission: 'promotion.view' },
            ],
        },
        {
            group: 'Content',
            items: [
                { label: 'Pages', href: route('admin.cms-pages.index'), icon: <FileText size={17} />, permission: 'cms.view' },
                { label: 'Theme Templates', href: route('admin.theme-templates.index'), icon: <LayoutTemplate size={17} />, permission: 'cms.update' },
                { label: 'Reviews', href: route('admin.reviews.index'), icon: <MessageSquare size={17} />, permission: 'reviews.moderate' },
            ],
        },
    ];

    const initials = (auth.user?.name ?? 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

    const isActive = (href: string) => {
        try {
            const path = new URL(href, window.location.origin).pathname;
            return currentUrl.startsWith(path) && path !== '/admin' ? true : currentUrl === path;
        } catch {
            return false;
        }
    };

    return (
        <div className="min-h-screen bg-[#f0f0f1] text-[#1d2327]">
            {/* WordPress-style admin bar */}
            <div className="fixed inset-x-0 top-0 z-40 flex h-10 items-center justify-between bg-[#1d2327] px-3 text-[#f0f0f1]">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-[#2271b1] text-xs font-bold">V</span>
                    <span className="text-[13px] font-medium">Visual Commerce</span>
                    <a href="/" target="_blank" rel="noreferrer" className="ml-2 text-[12px] text-[#a7aaad] hover:text-white">↗ Visit site</a>
                </div>
                <div className="relative">
                    <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded px-2 py-1 text-[12px] text-[#c3c4c7] hover:bg-white/10 hover:text-white">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2271b1] text-[10px] font-bold text-white">{initials}</span>
                        Howdy, {auth.user?.name?.split(' ')[0] ?? 'Admin'}
                        <ChevronDown size={13} />
                    </button>
                    {userMenu && (
                        <div className="absolute right-0 mt-1 w-48 overflow-hidden rounded-md border border-gray-200 bg-white text-[#1d2327] shadow-lg">
                            <div className="border-b border-gray-100 px-3 py-2">
                                <p className="text-xs font-medium">{auth.user?.name}</p>
                                <p className="text-[11px] text-gray-500">{auth.user?.email}</p>
                            </div>
                            <Link href={route('profile.edit')} className="block px-3 py-2 text-[13px] hover:bg-gray-50">Edit Profile</Link>
                            <Link href={route('logout')} method="post" as="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50">
                                <LogOut size={14} /> Log Out
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex pt-10">
                {/* WordPress-style dark side menu */}
                <aside className="fixed bottom-0 left-0 top-10 w-44 overflow-y-auto bg-[#1d2327] text-[#c3c4c7]">
                    <nav className="py-1">
                        {navGroups.map((group) => {
                            const visibleItems = group.items.filter((item) => !item.permission || can(item.permission));
                            if (visibleItems.length === 0) return null;
                            return (
                                <div key={group.group} className="py-1">
                                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8c8f94]">{group.group}</p>
                                    {visibleItems.map((item) => {
                                        const active = isActive(item.href);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
                                                    active
                                                        ? 'border-l-[3px] border-[#2271b1] bg-[#2271b1] pl-[9px] font-medium text-white'
                                                        : 'border-l-[3px] border-transparent hover:bg-[#2c3338] hover:text-[#72aee6]'
                                                }`}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main content */}
                <main className="ml-44 min-h-[calc(100vh-2.5rem)] flex-1 px-8 py-6">
                    <h1 className="mb-4 text-[23px] font-normal text-[#1d2327]">{title ?? 'Dashboard'}</h1>

                    {flash.success && (
                        <div className="mb-4 rounded-sm border-l-4 border-[#00a32a] bg-white px-4 py-3 text-sm text-[#1d2327] shadow-sm">
                            {flash.success}
                        </div>
                    )}
                    {flash.error && (
                        <div className="mb-4 rounded-sm border-l-4 border-[#d63638] bg-white px-4 py-3 text-sm text-[#1d2327] shadow-sm">
                            {flash.error}
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}
