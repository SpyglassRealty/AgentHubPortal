import React from 'react';

interface Agent {
  id: number;
  name: string;
  sales: number;
  commissionRate: number;
}

const AgentDashboard: React.FC = () => {
  const agents: Agent[] = [
    { id: 1, name: 'Alice Smith', sales: 150000, commissionRate: 0.02 },
    { id: 2, name: 'Bob Johnson', sales: 220000, commissionRate: 0.025 },
    { id: 3, name: 'Charlie Brown', sales: 180000, commissionRate: 0.03 },
  ];

  const totalSales = agents.reduce((sum, agent) => sum + agent.sales, 0);
  const totalCommission = agents.reduce((sum, agent) => sum + agent.sales * agent.commissionRate, 0);

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-4">Agent Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold">Total Sales</h2>
          <p className="text-xl">${totalSales}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold">Total Commission</h2>
          <p className="text-xl">${totalCommission}</p>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;