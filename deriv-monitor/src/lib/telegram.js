export async function sendTelegramAlert(message) {
  const botToken = localStorage.getItem('tg_bot_token')
  const chatId = localStorage.getItem('tg_chat_id')
  if (!botToken || !chatId) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })
    return res.ok
  } catch { return false }
}

export function buildAlertMessage(alert, metrics) {
  const emoji = alert.level === 'danger' ? '🔴' : '🟡'
  return `${emoji} <b>Alerta — Deriv Monitor</b>\n\n⚠️ ${alert.msg}\n\n📊 <b>Comet V5.1 — Status atual:</b>\n• Win rate: ${metrics.winRate}%\n• Lucro: $${metrics.profit}\n• Operações: ${metrics.total}\n• Maior seq. perdas: ${metrics.maxLossStreak}\n\nAcesse o monitor para ver sugestões da IA.`
}
