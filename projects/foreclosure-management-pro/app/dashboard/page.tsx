import Link from 'next/link';
import { PropertyService } from '@/lib/properties';
import {
  BuildingOfficeIcon,
  ListBulletIcon,
  HomeIcon,
  EyeIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export const revalidate = 0; // Don't cache this page

export default async function DashboardPage() {
  const stats = PropertyService.getDashboardStats();

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.total_properties,
      icon: BuildingOfficeIcon,
      color: 'orange',
    },
    {
      title: 'Listed on MLS',
      value: stats.listed_on_mls,
      icon: ListBulletIcon,
      color: 'blue',
    },
    {
      title: 'Occupied',
      value: stats.occupied,
      icon: HomeIcon,
      color: 'orange',
    },
    {
      title: 'Needs Visit',
      value: stats.needs_visit,
      icon: EyeIcon,
      color: 'yellow',
    },
    {
      title: 'Clients',
      value: stats.clients,
      icon: UsersIcon,
      color: 'purple',
    },
    {
      title: 'Vendors',
      value: stats.vendors,
      icon: WrenchScrewdriverIcon,
      color: 'green',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Overview of your foreclosure portfolio</p>
        </div>
        <Link href="/properties/new" className="btn-primary flex items-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Property
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${
                stat.color === 'orange' ? 'bg-orange-500' :
                stat.color === 'blue' ? 'bg-blue-500' :
                stat.color === 'yellow' ? 'bg-yellow-500' :
                stat.color === 'purple' ? 'bg-purple-500' :
                stat.color === 'green' ? 'bg-green-500' :
                'bg-gray-500'
              }`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-gray-400 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Properties Due This Week */}
      {stats.properties_due_this_week.length > 0 && (
        <div className="mb-8">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-6 w-6 text-spyglass-orange mr-3" />
                <div>
                  <h2 className="text-xl font-bold text-white">Properties Due This Week</h2>
                  <p className="text-xs text-gray-400">Current calendar week (Monday - Sunday)</p>
                </div>
              </div>
              <span className="status-badge bg-spyglass-orange text-white">
                {stats.properties_due_this_week.length} Properties
              </span>
            </div>
            
            <div className="space-y-4">
              {stats.properties_due_this_week.map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="block group"
                >
                  <div className="p-4 bg-spyglass-dark rounded-lg border border-gray-700 group-hover:border-spyglass-orange transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-spyglass-orange transition-colors">
                          {property.address}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {property.city}, {property.state} {property.zip_code} • {property.client_name}
                        </p>
                        <div className="mt-2 flex items-center space-x-4">
                          <div className="flex items-center text-sm text-gray-400">
                            <CalendarDaysIcon className="h-4 w-4 mr-1" />
                            Last visit: {property.last_visit_date || 'Never'}
                          </div>
                          <div className="text-sm">
                            <span className={`status-badge ${
                              property.visit_schedule === 'weekly' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
                            }`}>
                              {property.visit_schedule} schedule
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-spyglass-orange font-medium">
                          Due: {property.next_visit_due}
                        </div>
                        {property.days_until_visit !== undefined && (
                          <div className={`text-xs ${
                            property.days_until_visit <= 0 ? 'text-red-400' : 
                            property.days_until_visit <= 2 ? 'text-yellow-400' : 
                            'text-green-400'
                          }`}>
                            {property.days_until_visit <= 0 ? 'Overdue' : 
                             property.days_until_visit === 1 ? '1 day' : 
                             `${property.days_until_visit} days`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Properties */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Recent Properties</h2>
          <Link href="/properties" className="text-spyglass-orange hover:text-spyglass-orange-light flex items-center">
            View All <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </div>
        
        <div className="space-y-4">
          {PropertyService.getAllProperties().slice(0, 5).map((property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="block group"
            >
              <div className="flex justify-between items-start p-4 bg-spyglass-dark rounded-lg border border-gray-700 group-hover:border-gray-600 transition-colors">
                <div>
                  <h3 className="font-semibold text-white group-hover:text-spyglass-orange transition-colors">
                    {property.address}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {property.city}, {property.state} {property.zip_code} • {property.client_name}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {property.mls_number && (
                    <span className="status-mls">MLS</span>
                  )}
                  {property.occupied && (
                    <span className="status-occupied">Occupied</span>
                  )}
                  <span className={`status-badge ${
                    property.status === 'active' ? 'status-active' :
                    property.status === 'pending' ? 'status-pending' :
                    'status-active'
                  }`}>
                    {property.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}