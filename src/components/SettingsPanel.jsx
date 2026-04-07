import { useState, useEffect } from 'react'
import { sendTelegramAlert } from '../lib/telegram'

export default function SettingsPanel({ onLogout }) {
  const [botToken, setBotToken] = useState(localStorage.getItem('tg_bot_token') || '')
  const [chatId, setChatId] = useState(localStorage.getItem('tg_chat_id') || '')
  const [testStatus, setTestStatus] = useState(null)
  const [saved, setSaved] = useState(false)

  function save() {
    localStorage.setItem('tg_bot_token', botToken)
    localStorage.setItem('tg_chat_id', chatId)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function testAlert() {
    setTestStatus('sending')
    const ok = await sendTelegramAlert('✅ <b>Deriv Monitor conectado!</b>\n\nAlertas do seu robô chegam aqui automaticamente.')
    setTestStatus(ok ? 'ok' : 'error')
    setTimeout(() => setTestStatus(null), 3000)
  }

  return (
    <div style={styles.wrap}>
      <Section title="Alertas no Telegram">
        <p style={styles.desc}>
          Configure seu bot do Telegram para receber alertas automáticos quando o robô detectar sequências de perdas, win rate crítico, ou outros eventos importantes.
        </p>

        <div style={styles.steps}>
          <div style={styles.step}>
            <span style={styles.stepNum}>1</span>
            <span>Abra o Telegram e busque por <code style={styles.code}>@BotFather</code></span>
          </div>
          <div style={styles.step}>
            <span style={styles.stepNum}>2</span>
            <span>Envie <code style={styles.code}>/newbot</code> e siga as instruções para criar seu bot</span>
          </div>
          <div style={styles.step}>
            <span style={styles.stepNum}>3</span>
            <span>Copie o <b>token</b> que o BotFather enviar</span>
          </div>
          <div style={styles.step}>
            <span style={styles.stepNum}>4</span>
            <span>Fale com seu bot e acesse <code style={styles.code}>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> para ver seu Chat ID</span>
          </div>
        </div>

        <Field label="Bot Token" value={botToken} onChange={setBotToken} placeholder="1234567890:ABCDEFabcdef..." mono />
        <Field label="Chat ID" value={chatId} onChange={setChatId} placeholder="-1001234567890" mono />

        <div style={styles.btnRow}>
          <button style={styles.btn} onClick={save}>{saved ? '✓ Salvo' : 'Salvar'}</button>
          <button style={{...styles.btn, ...styles.btnOutline}} onClick={testAlert} disabled={!botToken || !chatId}>
            {testStatus === 'sending' ? 'Enviando...' : testStatus === 'ok' ? '✓ Enviado!' : testStatus === 'error' ? '✗ Erro' : 'Enviar teste'}
          </button>
        </div>
      </Section>

      <Section title="Regras de alerta">
        <AlertRule icon="🔴" label="Sequência de perdas ≥ 5" desc="Alerta imediato ao detectar 5 perdas seguidas" />
        <AlertRule icon="🟡" label="Win rate < 40% (mín. 10 ops)" desc="Alerta quando a taxa de acerto cair abaixo do limiar" />
        <AlertRule icon="🔴" label="Perda acumulada > $50" desc="Alerta quando o prejuízo total ultrapassar $50" />
        <AlertRule icon="🟡" label="Fator de lucro < 0.8" desc="Alerta quando as perdas superarem muito os ganhos" />
      </Section>

      <Section title="Conta">
        <button style={{...styles.btn, ...styles.btnDanger}} onClick={onLogout}>Desconectar conta</button>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={sectionStyles.wrap}>
      <div style={sectionStyles.title}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, mono }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={fieldStyles.label}>{label}</label>
      <input
        style={{ ...fieldStyles.input, ...(mono ? { fontFamily: 'var(--font-mono)', fontSize: 13 } : {}) }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type="text"
      />
    </div>
  )
}

function AlertRule({ icon, label, desc }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
      </div>
    </div>
  )
}

const sectionStyles = {
  wrap: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  title: { fontSize: 13, fontWeight: 500, color: 'var(--accent2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' },
}

const fieldStyles = {
  label: { display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-display)', outline: 'none' },
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column' },
  desc: { fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: '1rem' },
  steps: { marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8 },
  step: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 },
  stepNum: { minWidth: 22, height: 22, background: 'rgba(124,92,252,0.15)', color: 'var(--accent2)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' },
  code: { background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent2)' },
  btnRow: { display: 'flex', gap: 8, marginTop: 4 },
  btn: { padding: '9px 18px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-display)' },
  btnOutline: { background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)' },
  btnDanger: { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.2)' },
}
