import { useState } from 'react'
import LoginScreen from './pages/LoginScreen'
import Dashboard from './pages/Dashboard'
import { useDerivWS, getMockData } from './hooks/useDerivWS'

function AppWithWS({ token, onLogout }) {
  const { status, account, trades, balance } = useDerivWS(token)
  return <Dashboard account={account} balance={balance} trades={trades} wsStatus={status} onLogout={onLogout} />
}

function AppWithMock({ onLogout }) {
  const mock = getMockData()
  return <Dashboard account={mock.account} balance={mock.balance} trades={mock.trades} wsStatus="demo" onLogout={onLogout} />
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('deriv_token') || null)
  const [isDemo, setIsDemo] = useState(false)

  function handleLogin(t) {
    if (t === '__demo__') { setIsDemo(true); return }
    sessionStorage.setItem('deriv_token', t)
    setToken(t)
  }

  function handleLogout() {
    sessionStorage.removeItem('deriv_token')
    setToken(null); setIsDemo(false)
  }

  if (!token && !isDemo) return <LoginScreen onLogin={handleLogin} />
  if (isDemo) return <AppWithMock onLogout={handleLogout} />
  return <AppWithWS token={token} onLogout={handleLogout} />
}
