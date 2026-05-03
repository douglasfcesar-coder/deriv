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
  const ctx = {
    loss_streak_3: `O Comet V5.1 acumulou 3 perdas consecutivas no R_25. Verifique se o Martingale foi ativado e se a Distância Mínima 0.0085 está filtrando corretamente em mercado lateral.`,
    loss_streak_5: `ALERTA CRÍTICO: 5 perdas seguidas no Comet V5.1. Com Martingale 1,20x o stake pode estar multiplicado. Avalie pausar.`,
    winrate_drop:  `Win rate abaixo de 40% no Comet V5.1. As EMAs podem estar em conflito em mercado lateral no R_25 com vela 120s.`,
    profit_neg:    `Prejuízo acumulado no Comet V5.1. Com prêmio de $2,36 e stake $0,36, cada win recupera múltiplos losses.`,
    every_10:      `Checkpoint automático após ${metrics.total} operações do Comet V5.1.`,
  }
  const prompt = buildPrompt(metrics) + `\n\nContexto do gatilho: ${ctx[trigger]}\n\nGere UMA sugestão urgente e específica para o Comet V5.1 agora.\nJSON: {"suggestions":[{"title":"...","body":"...","priority":"alta|media|baixa","chips":["..."],"trigger":"${trigger}"}]}`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
  })
  const data = await res.json()
  const raw = data.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim()
  return JSON.parse(raw).suggestions?.[0] || null
}

export function useRealtimeAI(trades) {
  const [feed, setFeed] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const firedAt = useRef({})
  const prevCount = useRef(0)

  const addToFeed = useCallback((suggestion, triggerLabel) => {
    setFeed(prev => [{ ...suggestion, id: Date.now(), ts: new Date(), triggerLabel }, ...prev.slice(0, 19)])
  }, [])

  useEffect(() => {
    if (!trades || trades.length === 0 || trades.length === prevCount.current) return
    const metrics = calcMetrics(trades)
    prevCount.current = trades.length
    for (const trigger of TRIGGERS) {
      const lastFired = firedAt.current[trigger.id] || 0
      if (trigger.check(metrics) && (trades.length - lastFired) >= trigger.cooldown) {
        firedAt.current[trigger.id] = trades.length
        setAnalyzing(true)
        fetchAISuggestion(metrics, trigger.id)
          .then(s => { if (s) addToFeed(s, trigger.id) })
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
    loss_streak_3: { title: 'Verificar Distância Mínima', body: '3 perdas seguidas no R_25. Em mercado lateral as EMAs ficam próximas — considere aumentar a Distância Mínima de 0.0085 temporariamente.', priority: 'media', chips: ['Distância Mínima', 'EMA', 'R_25'] },
    loss_streak_5: { title: 'Pausar Martingale', body: '5 perdas seguidas — com Martingale 1,20x e stake $0,36 o risco está crescendo. Verifique o Limite De Aposta ($10) e considere pausar.', priority: 'alta', chips: ['Martingale', 'pausa', 'risco'] },
    winrate_drop:  { title: 'EMAs em conflito', body: `Win rate ${m.winRate}% — as EMAs do Comet podem estar gerando sinais contraditórios. Mercado lateral no R_25 com vela 120s.`, priority: 'alta', chips: ['EMA', 'vela 120s', 'mercado lateral'] },
    profit_neg:    { title: 'Avaliar pausa', body: `Com $${Math.abs(m.profit).toFixed(2)} de prejuízo e prêmio de $2,36 por win, você precisa de ${Math.ceil(Math.abs(m.profit) / 2.36)} vitórias para recuperar.`, priority: 'alta', chips: ['prejuízo', 'recuperação'] },
    every_10:      { title: `Checkpoint — ${m.total} ops`, body: `Comet V5.1: win rate ${m.winRate}%, lucro $${m.profit.toFixed(2)}, fator ${m.profitFactor}x. ${m.profitFactor >= 1 ? 'Operando dentro do esperado.' : 'Fator abaixo de 1 — losses superam gains.'}`, priority: m.profitFactor >= 1 ? 'baixa' : 'media', chips: ['checkpoint', 'R_25'] },
  }
  return map[triggerId] || { title: 'Monitoramento', body: 'Comet V5.1 sendo monitorado.', priority: 'baixa', chips: [] }
}
