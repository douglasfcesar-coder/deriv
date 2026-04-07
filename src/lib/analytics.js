export function calcMetrics(trades) {
  if (!trades || trades.length === 0) {
    return { profit: 0, wins: 0, losses: 0, total: 0, winRate: 0, maxLossStreak: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, expectancy: 0 }
  }

  let profit = 0, wins = 0, losses = 0
  let curStreak = 0, maxLossStreak = 0
  let totalWinAmt = 0, totalLossAmt = 0

  trades.forEach(t => {
    profit += t.result
    if (t.status === 'win') {
      wins++; curStreak = 0; totalWinAmt += t.result
    } else {
      losses++; curStreak++
      if (curStreak > maxLossStreak) maxLossStreak = curStreak
      totalLossAmt += Math.abs(t.result)
    }
  })

  const total = wins + losses
  const winRate = total ? Math.round((wins / total) * 100) : 0
  const avgWin = wins ? +(totalWinAmt / wins).toFixed(2) : 0
  const avgLoss = losses ? +(totalLossAmt / losses).toFixed(2) : 0
  const profitFactor = totalLossAmt > 0 ? +(totalWinAmt / totalLossAmt).toFixed(2) : 0
  const expectancy = total ? +((winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss)).toFixed(2) : 0

  return { profit: +profit.toFixed(2), wins, losses, total, winRate, maxLossStreak, avgWin, avgLoss, profitFactor, expectancy }
}

export function getAlertStatus(metrics) {
  const alerts = []
  if (metrics.maxLossStreak >= 5) alerts.push({ level: 'danger', msg: `Sequência de ${metrics.maxLossStreak} perdas detectada` })
  if (metrics.winRate < 40 && metrics.total >= 10) alerts.push({ level: 'danger', msg: `Win rate crítico: ${metrics.winRate}%` })
  if (metrics.profitFactor < 0.8 && metrics.total >= 10) alerts.push({ level: 'warning', msg: `Fator de lucro baixo: ${metrics.profitFactor}` })
  if (metrics.profit < -50) alerts.push({ level: 'danger', msg: `Perda acumulada: $${Math.abs(metrics.profit).toFixed(2)}` })
  return alerts
}

export function buildPrompt(metrics, question = null) {
  const base = `Você é especialista em trading algorítmico na Deriv.
Dados do robô Deriv Bot (Blockly / Martingale / Dígitos):
- Win rate: ${metrics.winRate}%
- Lucro total: $${metrics.profit}
- Total de operações: ${metrics.total}
- Wins: ${metrics.wins} | Losses: ${metrics.losses}
- Maior sequência de perdas: ${metrics.maxLossStreak}
- Ganho médio por win: $${metrics.avgWin}
- Perda média por loss: $${metrics.avgLoss}
- Fator de lucro: ${metrics.profitFactor}
- Expectativa por op: $${metrics.expectancy}
- Estratégia: Martingale com dígitos, R_100 Volatility, stake base $2`

  if (question) {
    return base + `\n\nPergunta do trader: ${question}\n\nResponda de forma prática em 3-5 frases, em português.`
  }

  return base + `\n\nGere 3 sugestões práticas e específicas para melhorar este robô.
Responda APENAS em JSON válido, sem markdown:
{"suggestions":[{"title":"título","body":"explicação em 2-3 frases","priority":"alta|media|baixa","chips":["tag1","tag2"]}]}`
}
