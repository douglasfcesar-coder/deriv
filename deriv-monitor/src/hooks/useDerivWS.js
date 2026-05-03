import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089'
const RECONNECT_DELAY = 4000
const POLL_INTERVAL = 30000

function parseTrade(t) {
  const buy = parseFloat(t.buy_price || 0)
  const sell = parseFloat(t.sell_price || 0)
  const result = sell - buy
  return {
    id: t.transaction_id || t.contract_id || Math.random(),
    contract: t.shortcode || t.contract_type || 'Contrato',
    stake: buy, result,
    status: result >= 0 ? 'win' : 'loss',
    time: new Date((t.sell_time || t.purchase_time || Date.now() / 1000) * 1000),
  }
}

export function useDerivWS(token) {
  const ws = useRef(null)
  const reconnect = useRef(null)
  const pollTimer = useRef(null)
  const mounted = useRef(true)
  const [status, setStatus] = useState('connecting')
  const [account, setAccount] = useState(null)
  const [trades, setTrades] = useState([])
  const [balance, setBalance] = useState(null)

  const fetchHistory = useCallback((socket) => {
    if (socket && socket.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ profit_table: 1, description: 1, limit: 50, sort: 'DESC' }))
  }, [])

  const connect = useCallback(() => {
    if (!token || !mounted.current) return
    const socket = new WebSocket(WS_URL)
    ws.current = socket

    socket.onopen = () => {
      if (!mounted.current) { socket.close(); return }
      socket.send(JSON.stringify({ authorize: token }))
    }

    socket.onmessage = (e) => {
      if (!mounted.current) return
      let data
      try { data = JSON.parse(e.data) } catch { return }
      const type = data.msg_type

      if (type === 'authorize') {
        if (data.error) { setStatus('error'); return }
        const auth = data.authorize
        setAccount({ loginid: auth.loginid, currency: auth.currency, fullname: auth.fullname || auth.loginid })
        setBalance(parseFloat(auth.balance || 0))
        setStatus('connected')
        socket.send(JSON.stringify({ balance: 1, subscribe: 1 }))
        socket.send(JSON.stringify({ transaction: 1, subscribe: 1 }))
        fetchHistory(socket)
        clearInterval(pollTimer.current)
        pollTimer.current = setInterval(() => fetchHistory(socket), POLL_INTERVAL)
      }

      if (type === 'balance' && data.balance)
        setBalance(parseFloat(data.balance.balance || 0))

      if (type === 'transaction' && data.transaction) {
        const tx = data.transaction
        if (tx.action === 'sell' && tx.amount != null) {
          const trade = {
            id: tx.transaction_id,
            contract: tx.longcode || tx.contract_type || 'Contrato',
            stake: parseFloat(tx.purchase || 0),
            result: parseFloat(tx.amount || 0),
            status: parseFloat(tx.amount || 0) >= 0 ? 'win' : 'loss',
            time: new Date(),
          }
          setTrades(prev => prev.find(t => t.id === trade.id) ? prev : [trade, ...prev].slice(0, 100))
          if (tx.balance != null) setBalance(parseFloat(tx.balance))
        }
      }

      if (type === 'profit_table' && data.profit_table) {
        const txs = (data.profit_table.transactions || []).map(parseTrade)
        setTrades(prev => {
          const ids = new Set(prev.map(t => t.id))
          const newOnes = txs.filter(t => !ids.has(t.id))
          if (!newOnes.length) return prev
          return [...newOnes, ...prev].sort((a, b) => b.time - a.time).slice(0, 100)
        })
      }
    }

    socket.onerror = () => { if (mounted.current) setStatus('error') }
    socket.onclose = () => {
      clearInterval(pollTimer.current)
      if (!mounted.current) return
      setStatus('connecting')
      reconnect.current = setTimeout(() => { if (mounted.current) connect() }, RECONNECT_DELAY)
    }
  }, [token, fetchHistory])

  useEffect(() => {
    if (!token) return
    mounted.current = true
    connect()
    return () => {
      mounted.current = false
      clearTimeout(reconnect.current)
      clearInterval(pollTimer.current)
      if (ws.current) { ws.current.onclose = null; ws.current.close(); ws.current = null }
    }
  }, [token, connect])

  return { status, account, trades, balance }
}

export function getMockData() {
  const types = ['RUNS R_25', 'RUNS R_25', 'RUNS R_25', 'RUNS R_25']
  const trades = Array.from({ length: 30 }, (_, i) => {
    const win = Math.random() > 0.42
    const stake = 0.36
    const result = win ? +(stake * (Math.random() * 0.85 + 0.7)).toFixed(2) : -stake
    return { id: i + 1, contract: types[i % types.length], stake, result, status: win ? 'win' : 'loss', time: new Date(Date.now() - (30 - i) * 4 * 60000) }
  })
  return { account: { loginid: 'CR-Demo', currency: 'USD', fullname: 'Demo Trader' }, balance: 1247.83, trades }
}
