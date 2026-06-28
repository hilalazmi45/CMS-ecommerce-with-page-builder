/**
 * AccountLayout — shared side-navigation for all My Account pages.
 *
 * Renders a two-column layout on desktop: side nav on the left, page content
 * on the right. Collapses to a top-bar nav strip on mobile.
 *
 * SSR-safe: no window / document access at render time.
 */

import { Link, router } from '@inertiajs/react';
import {
    LayoutDashboard,
    ShoppingBag,
    MapPin,
    User,
    Heart,
    LogOut,
} from 'lucide-react';
import StorefrontLayout from '@/Layouts/StorefrontLayout';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', href: route('account.dashboard'), icon: <LayoutDashboard size={16} aria-hidden="true" /> },
    { label: 'Orders', href: route('account.orders'), icon: <ShoppingBag size={16} aria-hidden="true" /> },
    { label: 'Wishlist', href: route('account.wishlist'), icon: <Heart size={16} aria-hidden="true" /> },
    { label: 'Addresses', href: route('account.addresses'), icon: <MapPin size={16} aria-hidden="true" /> },
    { label: 'Account Details', href: route('account.details'), icon: <User size={16} aria-hidden="true" /> },
];

interface AccountLayoutProps {
    children: React.ReactNode;
    /** Current route name to highlight active nav item. */
    activeRoute: string;
    /** Page <title> content. */
    title: string;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
    return (
        <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                    ? 'bg-[#e60012] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            ].join(' ')}
        >
            {item.icon}
            {item.label}
        </Link>
    );
}

export default function AccountLayout({ children, activeRoute, title }: AccountLayoutProps) {
    function handleLogout() {
        router.post(route('logout'));
    }

    return (
        <StorefrontLayout>
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <h1 className="mb-6 text-2xl font-bold text-gray-900 sm:text-3xl">My Account</h1>

                <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
                    {/* Side nav */}
                    <nav aria-label="Account navigation">
                        <ul className="flex flex-row flex-wrap gap-1 lg:flex-col" role="list">
                            {NAV_ITEMS.map((item) => (
                                <li key={item.href}>
                                    <NavLink item={item} active={activeRoute === item.href} />
                                </li>
                            ))}
                            <li className="mt-1 lg:mt-4">
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-[#e60012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e60012]"
                                >
                                    <LogOut size={16} aria-hidden="true" />
                                    Logout
                                </button>
                            </li>
                        </ul>
                    </nav>

                    {/* Page content */}
                    <div>
                        <h2 className="mb-6 text-xl font-semibold text-gray-900">{title}</h2>
                        {children}
                    </div>
                </div>
            </div>
        </StorefrontLayout>
    );
}
