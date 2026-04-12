import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089'

export function useDerivWS(token) {
  const ws = useRef(null)
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [account, setAccount] = useState(null)
  const [trades, setTrades] = useState([])
  const [balance, setBalance] = useState(null)
  const handlers = useRef({})

  const send = useCallback((msg) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg))
    }
  }, [])

  const on = useCallback((type, fn) => {
    handlers.current[type] = fn
  }, [])

  useEffect(() => {
    if (!token) return
    setStatus('connecting')

    const socket = new WebSocket(WS_URL)
    ws.current = socket

    socket.onopen = () => {
      socket.send(JSON.stringify({ authorize: token }))
    }

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data)
      const type = data.msg_type

      if (type === 'authorize') {
        if (data.error) { setStatus('error'); return }
        const auth = data.authorize
        setAccount({
          loginid: auth.loginid,
          email: auth.email,
          currency: auth.currency,
          fullname: auth.fullname || auth.loginid,
        })
        setBalance(auth.balance)
        setStatus('connected')
        // Subscribe to balance updates
        socket.send(JSON.stringify({ balance: 1, subscribe: 1 }))
        // Fetch profit table
        socket.send(JSON.stringify({ profit_table: 1, description: 1, limit: 50, sort: 'DESC' }))
      }

      if (type === 'balance' && data.balance) {
        setBalance(data.balance.balance)
      }

      if (type === 'profit_table' && data.profit_table) {
        const txs = (data.profit_table.transactions || []).map(t => {
          const buy = parseFloat(t.buy_price || 0)
          const sell = parseFloat(t.sell_price || 0)
          const result = sell - buy
          return {
            id: t.transaction_id,
            contract: t.shortcode || t.contract_type || 'Contrato',
            stake: buy,
            result,
            status: result >= 0 ? 'win' : 'loss',
            time: new Date(t.sell_time * 1000),
          }
        })
        setTrades(txs)
        if (handlers.current.trades) handlers.current.trades(txs)
      }

      if (handlers.current[type]) handlers.current[type](data)
    }

    socket.onerror = () => setStatus('error')
    socket.onclose = () => {
      if (status !== 'idle') setStatus('error')
    }

    return () => {
      socket.close()
      ws.current = null
    }
  }, [token])

  return { status, account, trades, balance, send, on }
}

// Generate mock data for demo/testing
export function getMockData() {
  const types = ['CALL R_100', 'PUT R_100', 'DIGITOVER R_75', 'DIGITUNDER R_50', 'CALL R_75', 'PUT R_50']
  const trades = Array.from({ length: 30 }, (_, i) => {
    const win = Math.random() > 0.42
    const stake = [1, 2, 2, 5, 5, 10][Math.floor(Math.random() * 6)]
    const result = win ? +(stake * (Math.random() * 0.85 + 0.7)).toFixed(2) : -stake
    return {
      id: i + 1,
      contract: types[i % types.length],
      stake,
      result,
      status: win ? 'win' : 'loss',
      time: new Date(Date.now() - (30 - i) * 4 * 60000),
    }
  })
  return {
    account: { loginid: 'CR-Demo', currency: 'USD', fullname: 'Demo Trader' },
    balance: 1247.83,
    trades,
  }
}
