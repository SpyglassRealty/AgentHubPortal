'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSales: number;
  commissionRate: number;
  ytdCommission: number;
  activeLead: number;
  closingsThisMonth: number;
  status: 'active' | 'inactive';
  joinDate: string;
}

const sampleAgents: Agent[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@spyglassrealty.com',
    phone: '(555) 123-4567',
    totalSales: 2450000,
    commissionRate: 2.5,
    ytdCommission: 61250,
    activeLead: 15,
    closingsThisMonth: 3,
    status: 'active',
    joinDate: '2023-01-15'
  },
  {
    id: '2', 
    name: 'Michael Chen',
    email: 'michael.chen@spyglassrealty.com',
    phone: '(555) 234-5678',
    totalSales: 1890000,
    commissionRate: 2.0,
    ytdCommission: 37800,
    activeLead: 12,
    closingsThisMonth: 2,
    status: 'active',
    joinDate: '2023-03-20'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@spyglassrealty.com', 
    phone: '(555) 345-6789',
    totalSales: 3200000,
    commissionRate: 3.0,
    ytdCommission: 96000,
    activeLead: 22,
    closingsThisMonth: 5,
    status: 'active',
    joinDate: '2022-08-10'
  },
  {
    id: '4',
    name: 'David Thompson',
    email: 'david.thompson@spyglassrealty.com',
    phone: '(555) 456-7890',
    totalSales: 1250000,
    commissionRate: 2.0,
    ytdCommission: 25000,
    activeLead: 8,
    closingsThisMonth: 1,
    status: 'active',
    joinDate: '2023-06-01'
  }
];

export default function BrokerageDashboard() {
  const [agents, setAgents] = useState<Agent[]>(sampleAgents);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const totalSales = agents.reduce((sum, agent) => sum + agent.totalSales, 0);
  const totalCommission = agents.reduce((sum, agent) => sum + agent.ytdCommission, 0);
  const totalLeads = agents.reduce((sum, agent) => sum + agent.activeLead, 0);
  const totalClosings = agents.reduce((sum, agent) => sum + agent.closingsThisMonth, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">Spyglass Realty</h1>
                <p className="text-sm text-gray-500">Brokerage Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Ryan Rodenbeck</span>
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['overview', 'agents', 'leads', 'transactions', 'compliance', 'reports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">$</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Sales YTD</dt>
                        <dd className="text-lg font-medium text-gray-900">${totalSales.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">C</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Commission YTD</dt>
                        <dd className="text-lg font-medium text-gray-900">${totalCommission.toLocaleString()}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">L</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Leads</dt>
                        <dd className="text-lg font-medium text-gray-900">{totalLeads}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">T</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Closings This Month</dt>
                        <dd className="text-lg font-medium text-gray-900">{totalClosings}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Performance */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Top Performing Agents</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Year-to-date performance metrics</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {agents.map((agent) => (
                  <li key={agent.id}>
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {agent.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                          <div className="text-sm text-gray-500">{agent.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">${agent.totalSales.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">Total Sales</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">${agent.ytdCommission.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">YTD Commission</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{agent.activeLead}</div>
                          <div className="text-sm text-gray-500">Active Leads</div>
                        </div>
                        <button 
                          onClick={() => setSelectedAgent(agent)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div>
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h1 className="text-xl font-semibold text-gray-900">Agent Management</h1>
                <p className="mt-2 text-sm text-gray-700">Manage your real estate agents and their performance.</p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                >
                  Add Agent
                </button>
              </div>
            </div>
            <div className="mt-8 flex flex-col">
              <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                            Agent
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Contact
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            YTD Sales
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Commission Rate
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Status
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {agents.map((agent) => (
                          <tr key={agent.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-700">
                                      {agent.name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                  <div className="text-sm text-gray-500">Joined {new Date(agent.joinDate).toLocaleDateString()}</div>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <div>{agent.email}</div>
                              <div>{agent.phone}</div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              ${agent.totalSales.toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {agent.commissionRate}%
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {agent.status}
                              </span>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <button 
                                onClick={() => setSelectedAgent(agent)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leads' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-400 text-3xl">📊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Lead Management</h3>
            <p className="text-gray-500">Coming soon - Lead capture, scoring, and nurturing system</p>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-400 text-3xl">📋</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction Management</h3>
            <p className="text-gray-500">Coming soon - Document management, e-signatures, and closing coordination</p>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-400 text-3xl">⚖️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance & Legal</h3>
            <p className="text-gray-500">Coming soon - Trust account management, TREC compliance, and regulatory reporting</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-gray-400 text-3xl">📈</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics & Reports</h3>
            <p className="text-gray-500">Coming soon - Custom reports, KPI dashboards, and business intelligence</p>
          </div>
        )}
      </main>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">{selectedAgent.name} - Details</h3>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h4>
                <p className="text-sm text-gray-900">{selectedAgent.email}</p>
                <p className="text-sm text-gray-900">{selectedAgent.phone}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Performance Metrics</h4>
                <p className="text-sm text-gray-900">Total Sales: ${selectedAgent.totalSales.toLocaleString()}</p>
                <p className="text-sm text-gray-900">YTD Commission: ${selectedAgent.ytdCommission.toLocaleString()}</p>
                <p className="text-sm text-gray-900">Active Leads: {selectedAgent.activeLead}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Edit Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}