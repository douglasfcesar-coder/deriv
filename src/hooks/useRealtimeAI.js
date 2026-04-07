import { useState, useEffect, useRef, useCallback } from 'react'
import { calcMetrics, buildPrompt } from '../lib/analytics'

const TRIGGERS = [
  { id: 'loss_streak_3', check: (m) => m.maxLossStreak >= 3, cooldown: 5 },
  { id: 'loss_streak_5', check: (m) => m.maxLossStreak >= 5, cooldown: 10 },
  { id: 'winrate_drop',  check: (m) => m.total >= 8 && m.winRate < 40, cooldown: 8 },
  { id: 'profit_neg',   check: (m) => m.total >= 5 && m.profit < -20, cooldown: 8 },
  { id: 'every_10',     check: (m) => m.total > 0 && m.total % 10 === 0, cooldown: 1 },
]

async function fetchAISuggestion(metrics, trigger) {
  const contextMap = {
    loss_streak_3: `O Comet V4.1 acumulou 3 perdas consecutivas no R_10. Verifique se o Martingale já foi ativado e se a Distância Mínima entre as EMAs está filtrando corretamente.`,
    loss_streak_5: `ALERTA CRÍTICO: 5 perdas seguidas no Comet V4.1. O Martingale pode estar multiplicando o stake perigosamente. Avalie pausar o robô.`,
    winrate_drop:  `Win rate abaixo de 40% no Comet V4.1. As 6 EMAs e 6 SMAs podem estar gerando sinais conflitantes em mercado lateral no R_10.`,
    profit_neg:    `Prejuízo acumulado superou $20 no Comet V4.1. Com stake inicial de $0,36 e take profit de $1,00, a recuperação exige muitas operações vencedoras.`,
    every_10:      `Checkpoint automático após ${metrics.total} operações do Comet V4.1 no R_10.`,
  }

  const prompt = buildPrompt(metrics) +
    `\n\nContexto do gatilho automático: ${contextMap[trigger] || 'Análise automática.'}\n\nGere UMA sugestão urgente e muito específica para o Comet V4.1 neste momento. Mencione parâmetros concretos do robô.\nJSON: {"suggestions":[{"title":"...","body":"...","priority":"alta|media|baixa","chips":["..."],"trigger":"${trigger}"}]}`

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
  const [feed, setFeed]           = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const firedAt   = useRef({})
  const prevCount = useRef(0)

  const addToFeed = useCallback((suggestion, triggerLabel) => {
    setFeed(prev => [{
      ...suggestion,
      id: Date.now(),
      ts: new Date(),
      triggerLabel,
      isNew: true,
    }, ...prev.slice(0, 19)])
  }, [])

  useEffect(() => {
    if (!trades || trades.length === 0) return
    if (trades.length === prevCount.current) return

    const metrics = calcMetrics(trades)
    prevCount.current = trades.length

    for (const trigger of TRIGGERS) {
      const lastFired = firedAt.current[trigger.id] || 0
      const opsSince  = trades.length - lastFired

      if (trigger.check(metrics) && opsSince >= trigger.cooldown) {
        firedAt.current[trigger.id] = trades.length
        setAnalyzing(true)

        fetchAISuggestion(metrics, trigger.id)
          .then(suggestion => { if (suggestion) addToFeed(suggestion, trigger.id) })
          .catch(() => addToFeed(getFallback(metrics, trigger.id), trigger.id))
          .finally(() => setAnalyzing(false))

        break
      }
    }
  }, [trades.length])

  return { feed, analyzing }
}

function getFallback(m, triggerId) {
  const map = {
    loss_streak_3: {
      title: 'Verificar Distância Mínima',
      body: '3 perdas seguidas no Comet V4.1. Em mercado lateral no R_10, as EMAs ficam próximas — aumente o parâmetro Distância Mínima para evitar entradas em sinais fracos.',
      priority: 'media',
      chips: ['Distância Mínima', 'EMA', 'R_10'],
    },
    loss_streak_5: {
      title: 'Pausar Martingale urgente',
      body: '5 perdas seguidas — com stake inicial $0,36 e Martingale ativo, o stake pode já estar multiplicado. Verifique o Limite De Aposta atual e considere pausar o robô para revisão.',
      priority: 'alta',
      chips: ['Martingale', 'Limite De Aposta', 'pausa'],
    },
    winrate_drop: {
      title: 'EMAs em conflito — mercado lateral',
      body: `Win rate ${m.winRate}% indica que as 6 EMAs e 6 SMAs do Comet estão gerando sinais contraditórios. Considere aumentar o intervalo de vela de 60s para 120s ou aumentar a Distância Mínima.`,
      priority: 'alta',
      chips: ['EMA', 'SMA', 'intervalo de vela', 'mercado lateral'],
    },
    profit_neg: {
      title: 'Take Profit muito baixo para recuperar',
      body: `Com $${Math.abs(m.profit).toFixed(2)} de prejuízo e take profit de $1,00, serão necessárias muitas operações para recuperar. Avalie aumentar o Lucro Esperado ou reduzir o Limite de Perda para proteger o saldo restante.`,
      priority: 'alta',
      chips: ['Take Profit', 'Limite de Perda', 'gestão'],
    },
    every_10: {
      title: `Checkpoint — ${m.total} operações`,
      body: `Comet V4.1: win rate ${m.winRate}%, lucro $${m.profit.toFixed(2)}, fator de lucro ${m.profitFactor}x. ${m.profitFactor >= 1 ? 'Robô operando dentro do esperado no R_10.' : 'Fator abaixo de 1 — as perdas superam os ganhos. Revise a Distância Mínima e o número de derrotas para ativar o Martingale.'}`,
      priority: m.profitFactor >= 1 ? 'baixa' : 'media',
      chips: ['checkpoint', 'fator de lucro', 'R_10'],
    },
  }
  return map[triggerId] || { title: 'Análise automática', body: 'Monitoramento ativo no Comet V4.1.', priority: 'baixa', chips: [] }
}
