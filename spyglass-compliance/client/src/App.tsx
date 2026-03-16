import { useState, useEffect } from 'react'
import Login from './pages/Login'
import AgentDashboard from './pages/AgentDashboard'
import NewDeal from './pages/NewDeal'
import { User } from './types'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'new-deal'>('login')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
        setCurrentPage('dashboard')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (userData: User) => {
    setUser(userData)
    setCurrentPage('dashboard')
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Logout failed:', error)
    }
    setUser(null)
    setCurrentPage('login')
  }

  const navigateTo = (page: 'dashboard' | 'new-deal') => {
    setCurrentPage(page)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  switch (currentPage) {
    case 'new-deal':
      return <NewDeal user={user} onNavigate={navigateTo} onLogout={handleLogout} />
    default:
      return <AgentDashboard user={user} onNavigate={navigateTo} onLogout={handleLogout} />
  }
}

export default App