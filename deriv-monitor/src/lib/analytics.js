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

const ROBOT_CONTEXT = `
ROBÔ: Comet V4.1 (Deriv Bot / Blockly)

CONFIGURAÇÕES ATUAIS:
- Mercado: Índice Sintético R_10 (Volatility 10 Index)
- Tipo de contrato: Runs (sequências de alta/baixa)
- Intervalo de vela: 60 segundos
- Aposta inicial: $0,36
- Aposta ao vencer: $0,36 (reseta ao valor inicial após vitória)
- Limite de aposta (teto Martingale): $999
- Limite de perda (stop loss): $300
- Lucro esperado (take profit): $1,00

LÓGICA DE ENTRADA:
- Usa 6 EMAs e 6 SMAs para identificar tendência
- Analisa direção da vela atual (verde = alta / vermelha = baixa)
- Analisa tique-taque em tempo real (rise/fall) como confirmação de entrada
- Usa Distância Mínima entre EMAs como filtro — valor atual configurado: 0.0085 (escala compatível com os ticks do R_10 que variam entre 0,001 e 0,01). Só entra quando as EMAs estão separadas por pelo menos esse valor, filtrando mercado lateral
- Variáveis Libera Compra Call e Libera Compra Put controlam autorização de entrada
- Sistema de Derrota Virtual: simula operações sem dinheiro real para validar o sinal antes de entrar com dinheiro

GESTÃO DE RISCO E MARTINGALE:
- Martingale ativável e configurável pelo usuário
- Martingale inicia após X derrotas consecutivas (parâmetro configurável)
- Contador de Loss rastreia sequência de derrotas separadamente para Call e Put
- Teto máximo de aposta: $999 (muito alto em relação ao stake inicial de $0,36)
- Funcionalidade Vender Se Estiver Vencendo: venda antecipada de contrato no lucro
- Restart automático em caso de erro

PONTOS DE ATENÇÃO ESPECÍFICOS:
- R_10 tem volatilidade baixa — spreads podem corroer ganhos pequenos de $0,36
- Take profit de $1,00 é conservador — o robô pode parar cedo demais em dias bons
- Teto de $999 com stake inicial de $0,36 permite muitos níveis de Martingale (risco elevado de blow up)
- Derrota Virtual pode causar entradas tardias perdendo o início do movimento
- 6 EMAs + 6 SMAs podem gerar conflito de sinais em mercado lateral (ranging)
- Contrato tipo Runs em R_10 tem payout menor que outros contratos
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

  if (question) {
    return base + `\n\nPergunta do trader: ${question}\n\nResponda de forma prática e específica para o Comet V4.1, em 3-5 frases, em português. Mencione parâmetros concretos do robô quando relevante (ex: Distância Mínima, Limite De Aposta, Derrota Virtual, Take Profit, número de EMAs).`
  }

  return base + `\n\nGere 3 sugestões práticas e específicas para melhorar o Comet V4.1 com base nos dados acima.
Seja muito específico — mencione parâmetros reais do robô (ex: "aumente a Distância Mínima", "reduza o Limite De Aposta de $999 para $10", "ajuste o Take Profit").
Responda APENAS em JSON válido, sem markdown:
{"suggestions":[{"title":"título curto","body":"explicação em 2-3 frases com parâmetros concretos do robô","priority":"alta|media|baixa","chips":["tag1","tag2"]}]}`
}
