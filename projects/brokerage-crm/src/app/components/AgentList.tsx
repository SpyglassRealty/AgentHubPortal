import React from 'react';

interface Agent {
  id: number;
  name: string;
  sales: number;
  commissionRate: number;
}

const AgentList: React.FC = () => {
  const agents: Agent[] = [
    { id: 1, name: 'Alice Smith', sales: 150000, commissionRate: 0.02 },
    { id: 2, name: 'Bob Johnson', sales: 220000, commissionRate: 0.025 },
    { id: 3, name: 'Charlie Brown', sales: 180000, commissionRate: 0.03 },
  ];

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-4">Agent List</h1>
      <table className="table-auto">
        <thead>
          <tr>
            <th className="px-4 py-2">ID</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Sales</th>
            <th className="px-4 py-2">Commission Rate</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <td className="border px-4 py-2">{agent.id}</td>
              <td className="border px-4 py-2">{agent.name}</td>
              <td className="border px-4 py-2">${agent.sales}</td>
              <td className="border px-4 py-2">{agent.commissionRate * 100}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AgentList;