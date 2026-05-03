export function calcMetrics(trades) {
  if (!trades || trades.length === 0)
    return { profit: 0, wins: 0, losses: 0, total: 0, winRate: 0, maxLossStreak: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, expectancy: 0 }
  let profit = 0, wins = 0, losses = 0, curStreak = 0, maxLossStreak = 0, totalWinAmt = 0, totalLossAmt = 0
  trades.forEach(t => {
    profit += t.result
    if (t.status === 'win') { wins++; curStreak = 0; totalWinAmt += t.result }
    else { losses++; curStreak++; if (curStreak > maxLossStreak) maxLossStreak = curStreak; totalLossAmt += Math.abs(t.result) }
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

const ROBOT_CONTEXT = `
ROBÔ: Comet V5.1 (Deriv Bot / Blockly)
CONFIGURAÇÕES ATUAIS:
- Mercado: Índice Sintético R_25 (Volatility 25 Index)
- Tipo de contrato: Only Ups / Only Downs (Runs) com 3 ticks
- Intervalo de vela: 120 segundos
- Aposta inicial: $0,36 | Prêmio por vitória: $2,36 | Martingale: 1,20x
- Limite de aposta (teto Martingale): $10
- Limite de perda (stop loss): $30
- Martingale: inicia após 3 derrotas consecutivas
- Derrota Virtual: 1
- Execuções de confirmação: 3 ticks antes de liberar compra

LÓGICA DE ENTRADA:
- Usa 3 EMAs (ema, EMA1, EMA2) e SMAs para identificar tendência
- Vela Verde = VERDADEIRO → Compra Only Ups (Run High)
- Vela Vermelha = VERDADEIRO → Compra Only Downs (Run Low)
- Filtro: ema < EMA1 (Call) / ema > EMA1 (Put)
- Filtro: Último Tick acima/abaixo da ema com Distância Mínima de 0.0085
- Filtro: Último Tick acima/abaixo da abertura da vela de 120s
- Filtro de timing: Epoch % 60 < 45 (só entra nos primeiros 45s de cada minuto)
- Sistema de Derrota Virtual: valida sinal antes de entrar com dinheiro real

PONTOS IMPORTANTES:
- R_25 com vela 120s gera sinais mais suaves e confiáveis
- Only Ups/Downs com 3 ticks: prêmio de $2,36 para stake $0,36 (payout ~556%)
- Martingale de 1,20x é conservador — após 5 derrotas stake chega a ~$0,90
- Distância Mínima 0.0085 calibrada para a escala de ticks do R_25
`

export function buildPrompt(metrics, question = null) {
  const base = `Você é especialista em trading algorítmico na Deriv com profundo conhecimento de Deriv Bot (Blockly).

${ROBOT_CONTEXT}

DESEMPENHO ATUAL:
- Win rate: ${metrics.winRate}%
- Lucro total: $${metrics.profit}
- Total de operações: ${metrics.total}
- Wins: ${metrics.wins} | Losses: ${metrics.losses}
- Maior sequência de perdas consecutivas: ${metrics.maxLossStreak}
- Ganho médio por win: $${metrics.avgWin}
- Perda média por loss: $${metrics.avgLoss}
- Fator de lucro: ${metrics.profitFactor}
- Expectativa por operação: $${metrics.expectancy}`

  if (question)
    return base + `\n\nPergunta do trader: ${question}\n\nResponda de forma prática e específica para o Comet V5.1, em 3-5 frases, em português. Mencione parâmetros concretos do robô quando relevante.`

  return base + `\n\nGere 3 sugestões práticas e específicas para melhorar o Comet V5.1 com base nos dados acima. Mencione parâmetros reais do robô (Distância Mínima, Limite De Aposta, Derrota Virtual, Execuções, etc).\nResponda APENAS em JSON válido, sem markdown:\n{"suggestions":[{"title":"título curto","body":"explicação em 2-3 frases com parâmetros concretos","priority":"alta|media|baixa","chips":["tag1","tag2"]}]}`
}
