// Send alert to Telegram bot
// TOKEN and CHAT_ID are stored in localStorage (set via Settings page)

export async function sendTelegramAlert(message) {
  const botToken = localStorage.getItem('tg_bot_token')
  const chatId = localStorage.getItem('tg_chat_id')

  if (!botToken || !chatId) {
    console.warn('Telegram não configurado.')
    return false
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    return res.ok
  } catch (e) {
    console.error('Erro ao enviar alerta Telegram:', e)
    return false
  }
}

export function buildAlertMessage(alert, metrics) {
  const emoji = alert.level === 'danger' ? '🔴' : '🟡'
  return `${emoji} <b>Alerta — Deriv Monitor</b>

⚠️ ${alert.msg}

📊 <b>Status atual do robô:</b>
• Win rate: ${metrics.winRate}%
• Lucro: $${metrics.profit}
• Operações: ${metrics.total}
• Maior seq. perdas: ${metrics.maxLossStreak}

Acesse o monitor para ver sugestões da IA.`
}
