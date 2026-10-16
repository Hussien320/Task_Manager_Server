'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, History, Settings2, Truck } from 'lucide-react';

const navigationItems = [
  { label: 'Products', href: '/products', Icon: Boxes },
  { label: 'Suppliers', href: '/suppliers', Icon: Truck },
  { label: 'History Log', href: '/history', Icon: History },
  { label: 'App Settings', href: '/app-settings', Icon: Settings2 },
];

export default function DashboardNavbar() {
  const pathname = usePathname();

  return (
    <header className="w-full shrink-0 rounded-2xl border border-gray-700 bg-gray-800/70 px-4 py-5 shadow-lg shadow-black/10 md:min-h-[calc(100vh-5rem)] md:w-64 md:px-5">
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard"
          className="w-fit text-xl font-bold tracking-tight text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          Stock<span className="text-cyan-400">Pulse</span>
        </Link>

        <nav aria-label="Dashboard navigation">
          <ul className="flex flex-col gap-1">
            {navigationItems.map(({ label, href, Icon }) => {
              const isActive = pathname === href;

              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon aria-hidden="true" size={17} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
