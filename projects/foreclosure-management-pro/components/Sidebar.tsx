'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  DocumentChartBarIcon,
  ClockIcon,
  PowerIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Properties', href: '/properties', icon: BuildingOfficeIcon },
  { name: 'Clients', href: '/clients', icon: UsersIcon },
  { name: 'Vendors', href: '/vendors', icon: WrenchScrewdriverIcon },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  { name: 'Activity Log', href: '/activity', icon: ClockIcon },
  { name: 'Public Listings', href: '/public-listings', icon: GlobeAltIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="sidebar-nav">
      {/* Logo section */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-spyglass-orange rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Foreclosure Pro</h1>
            <p className="text-gray-400 text-xs">SPYGLASS REALTY</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">DR</span>
          </div>
          <div>
            <p className="text-white text-sm font-medium">Dustin Raye</p>
            <p className="text-gray-400 text-xs">dustin@spyglassrealty.com</p>
          </div>
        </div>
        <button className="flex items-center text-gray-400 hover:text-white transition-colors">
          <PowerIcon className="h-4 w-4 mr-2" />
          Sign Out
        </button>
      </div>
    </div>
  );
}