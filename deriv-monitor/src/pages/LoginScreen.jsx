import { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  function handleLogin() {
    if (!token.trim()) return
    setLoading(true)
    setTimeout(() => onLogin(token.trim()), 300)
  }

  function handleDemo() {
    onLogin('__demo__')
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card} className="fade-up">
        <div style={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M4 14l5-5 5 5 5-10 5 10" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={styles.title}>Deriv Monitor</h1>
        <p style={styles.subtitle}>Acompanhe seu robô com inteligência artificial</p>

        <div style={styles.field}>
          <label style={styles.label}>API Token da Deriv</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Cole seu token aqui..."
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoComplete="off"
          />
          <span style={styles.hint}>
            Gere em: Deriv → Configurações → Tokens de API (permissão: Read)
          </span>
        </div>

        <button style={{...styles.btn, ...styles.btnPrimary}} onClick={handleLogin} disabled={loading || !token}>
          {loading ? 'Conectando...' : 'Conectar à Deriv →'}
        </button>

        <div style={styles.divider}><span>ou</span></div>

        <button style={styles.btn} onClick={handleDemo}>
          Explorar com dados de demo
        </button>

        <p style={styles.note}>
          Seu token nunca sai do seu navegador. Conexão direta com a Deriv via WebSocket.
        </p>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    background: 'var(--bg)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: 16,
    padding: '2.5rem 2rem',
  },
  logo: {
    width: 52,
    height: 52,
    background: 'rgba(124,92,252,0.15)',
    border: '1px solid rgba(124,92,252,0.3)',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.25rem',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--muted)',
    marginBottom: '2rem',
    lineHeight: 1.5,
  },
  field: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--muted)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: 'var(--font-mono)',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg)',
    border: '1px solid var(--border2)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    marginBottom: 6,
  },
  hint: {
    fontSize: 11,
    color: 'var(--muted)',
    lineHeight: 1.5,
  },
  btn: {
    width: '100%',
    padding: '11px 16px',
    background: 'transparent',
    border: '1px solid var(--border2)',
    borderRadius: 10,
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'var(--font-display)',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnPrimary: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#fff',
    marginBottom: '0.75rem',
  },
  divider: {
    textAlign: 'center',
    fontSize: 12,
    color: 'var(--muted)',
    margin: '0.75rem 0',
  },
  note: {
    marginTop: '1.5rem',
    fontSize: 11,
    color: 'var(--muted)',
    textAlign: 'center',
    lineHeight: 1.6,
  },
}
