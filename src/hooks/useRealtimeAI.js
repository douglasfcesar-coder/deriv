import { useState, useEffect, useRef, useCallback } from 'react'
import { calcMetrics, buildPrompt } from '../lib/analytics'

// Triggers that cause a real-time re-analysis
const TRIGGERS = [
  { id: 'loss_streak_3', check: (m) => m.maxLossStreak >= 3, cooldown: 5 },
  { id: 'loss_streak_5', check: (m) => m.maxLossStreak >= 5, cooldown: 10 },
  { id: 'winrate_drop',  check: (m) => m.total >= 8 && m.winRate < 40, cooldown: 8 },
  { id: 'profit_neg',   check: (m) => m.total >= 5 && m.profit < -20, cooldown: 8 },
  { id: 'every_10',     check: (m) => m.total > 0 && m.total % 10 === 0, cooldown: 1 },
]

async function fetchAISuggestion(metrics, trigger) {
  const contextMap = {
    loss_streak_3: 'O robô acabou de completar 3 perdas consecutivas.',
    loss_streak_5: 'ALERTA: 5 perdas seguidas detectadas. Situação crítica.',
    winrate_drop:  'Win rate caiu abaixo de 40%. Analisar urgente.',
    profit_neg:    'Prejuízo acumulado passou de $20. Avaliar estratégia.',
    every_10:      `Análise de rotina após ${metrics.total} operações.`,
  }
  const context = contextMap[trigger] || 'Análise automática.'

  const prompt = buildPrompt(metrics) +
    `\n\nContexto do gatilho: ${context}\n\nGere UMA sugestão urgente e específica para este momento.\nJSON: {"suggestions":[{"title":"...","body":"...","priority":"alta|media|baixa","chips":["..."],"trigger":"${trigger}"}]}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  const raw = data.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(raw)
  return parsed.suggestions?.[0] || null
}

export function useRealtimeAI(trades) {
  const [feed, setFeed]       = useState([])   // live suggestion feed
  const [analyzing, setAnalyzing] = useState(false)
  const firedAt = useRef({})  // trigger_id -> last tradeCount when it fired
  const prevCount = useRef(0)

  const addToFeed = useCallback((suggestion, triggerLabel) => {
    setFeed(prev => [{
      ...suggestion,
      id: Date.now(),
      ts: new Date(),
      triggerLabel,
      isNew: true,
    }, ...prev.slice(0, 19)])  // keep last 20
  }, [])

  useEffect(() => {
    if (!trades || trades.length === 0) return
    if (trades.length === prevCount.current) return

    const metrics = calcMetrics(trades)
    prevCount.current = trades.length

    for (const trigger of TRIGGERS) {
      const lastFired = firedAt.current[trigger.id] || 0
      const opsSince = trades.length - lastFired

      if (trigger.check(metrics) && opsSince >= trigger.cooldown) {
        firedAt.current[trigger.id] = trades.length
        setAnalyzing(true)

        fetchAISuggestion(metrics, trigger.id)
          .then(suggestion => {
            if (suggestion) addToFeed(suggestion, trigger.id)
          })
          .catch(() => {
            // fallback inline suggestion
            addToFeed(getFallback(metrics, trigger.id), trigger.id)
          })
          .finally(() => setAnalyzing(false))

        break // one trigger at a time
      }
    }
  }, [trades.length])

  return { feed, analyzing }
}

function getFallback(m, triggerId) {
  const map = {
    loss_streak_3: { title: 'Pausa recomendada', body: '3 perdas seguidas detectadas. Considere pausar o robô por 15 minutos e revisar o mercado antes de continuar.', priority: 'media', chips: ['pausa', 'sequência'] },
    loss_streak_5: { title: 'Stop imediato recomendado', body: 'Sequência de 5 perdas. O Deriv Bot possui o bloco "Condição de parada" — configure-o para parar após 5 perdas e proteger seu saldo.', priority: 'alta', chips: ['stop', 'proteção', 'urgente'] },
    winrate_drop:  { title: 'Win rate crítico', body: `${m.winRate}% de acerto com Martingale é insustentável. Reduza o stake base para o mínimo e avalie trocar de dígito par/ímpar.`, priority: 'alta', chips: ['win rate', 'stake'] },
    profit_neg:    { title: 'Limite de perda atingido', body: 'Prejuízo acumulado relevante. Considere encerrar o robô por hoje e revisar a lógica amanhã com mente fria.', priority: 'alta', chips: ['drawdown', 'gestão'] },
    every_10:      { title: `Check de rota — ${m.total} ops`, body: `Win rate ${m.winRate}%, lucro $${m.profit.toFixed(2)}. ${m.profitFactor >= 1 ? 'Robô operando dentro do esperado.' : 'Fator de lucro abaixo de 1 — revise a estratégia.'}`, priority: m.profitFactor >= 1 ? 'baixa' : 'media', chips: ['checkpoint', 'análise'] },
  }
  return map[triggerId] || { title: 'Análise automática', body: 'Monitoramento ativo.', priority: 'baixa', chips: [] }
}
