import AgentList from './components/AgentList';
import AgentDashboard from './components/AgentDashboard';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <AgentDashboard />
      <AgentList />
    </main>
  )
}