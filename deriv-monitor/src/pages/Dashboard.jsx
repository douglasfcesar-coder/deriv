import { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import MetricCard from '../components/MetricCard'
import AIPanel from '../components/AIPanel'
import SettingsPanel from '../components/SettingsPanel'
import { calcMetrics, getAlertStatus } from '../lib/analytics'
import { sendTelegramAlert, buildAlertMessage } from '../lib/telegram'

const TABS = ['Visão geral', 'Operações', 'IA', 'Config']

export default function Dashboard({ account, balance, trades, wsStatus, onLogout }) {
  const [tab, setTab] = useState(0)
  const metrics = calcMetrics(trades)
  const sentAlerts = useRef(new Set())

  // Equity curve data
  const equityCurve = trades.slice().reverse().reduce((acc, t) => {
    const prev = acc.length ? acc[acc.length - 1].equity : 0
    acc.push({ equity: +(prev + t.result).toFixed(2), time: t.time?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '' })
    return acc
  }, [])

  // Auto-send Telegram alerts
  useEffect(() => {
    const alerts = getAlertStatus(metrics)
    alerts.forEach(alert => {
      const key = alert.msg
      if (!sentAlerts.current.has(key)) {
        sentAlerts.current.add(key)
        sendTelegramAlert(buildAlertMessage(alert, metrics))
      }
    })
  }, [trades.length])

  const fmt = (v, cur = 'USD') =>
    (v >= 0 ? '+' : '') + v.toLocaleString('pt-BR', { style: 'currency', currency: cur, minimumFractionDigits: 2 })

  const metricAccent = (val, good, bad) => val >= good ? 'green' : val <= bad ? 'red' : 'amber'

  return (
    <div style={styles.wrap}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <path d="M4 14l5-5 5 5 5-10 5 10" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={styles.logoText}>Deriv Monitor</span>
        </div>

        <div style={styles.accountInfo}>
          <div style={styles.accountId}>{account?.loginid || '—'}</div>
          <div style={styles.accountBal}>
            {balance != null
              ? balance.toLocaleString('pt-BR', { style: 'currency', currency: account?.currency || 'USD', minimumFractionDigits: 2 })
              : wsStatus === 'connecting' ? 'Conectando...' : '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: wsStatus === 'connected' ? 'var(--green)' : wsStatus === 'connecting' ? 'var(--amber)' : '#555', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {wsStatus === 'connected' ? 'ao vivo' : wsStatus === 'connecting' ? 'conectando...' : 'demo'}
            </span>
          </div>
        </div>

        <nav style={styles.nav}>
          {TABS.map((t, i) => (
            <button key={i} style={{ ...styles.navBtn, ...(tab === i ? styles.navBtnActive : {}) }} onClick={() => setTab(i)}>
              <span style={styles.navIcon}>{['▦', '≡', '✦', '⚙'][i]}</span>
              {t}
            </button>
          ))}
        </nav>

        <div style={styles.sideFooter}>
          <a href="https://app.deriv.com" target="_blank" rel="noreferrer" style={styles.sideLink}>Abrir Deriv →</a>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {tab === 0 && (
          <div className="fade-up">
            <div style={styles.pageHeader}>
              <div style={styles.pageTitle}>Visão geral</div>
              <div style={styles.pageSubtitle}>{metrics.total} operações analisadas</div>
            </div>

            <div style={styles.metricsGrid}>
              <MetricCard label="Lucro total" value={fmt(metrics.profit)} accent={metrics.profit >= 0 ? 'green' : 'red'} />
              <MetricCard label="Win rate" value={metrics.winRate + '%'} accent={metricAccent(metrics.winRate, 55, 40)} sub={`${metrics.wins}W / ${metrics.losses}L`} />
              <MetricCard label="Fator de lucro" value={metrics.profitFactor + 'x'} accent={metricAccent(metrics.profitFactor, 1.2, 0.9)} />
              <MetricCard label="Seq. max. perdas" value={metrics.maxLossStreak} accent={metricAccent(metrics.maxLossStreak, 0, 4, true)} sub="consecutivas" />
              <MetricCard label="Ganho médio" value={`$${metrics.avgWin}`} accent="green" />
              <MetricCard label="Perda média" value={`$${metrics.avgLoss}`} accent="red" />
            </div>

            {equityCurve.length > 2 && (
              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>Curva de equity</div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={equityCurve} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fill: '#6b6b80', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6b6b80', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                    <Tooltip contentStyle={{ background: '#17171f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f0f5', fontSize: 12 }} />
                    <Area type="monotone" dataKey="equity" stroke="#7c5cfc" strokeWidth={2} fill="url(#eq)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {tab === 1 && (
          <div className="fade-up">
            <div style={styles.pageHeader}>
              <div style={styles.pageTitle}>Operações</div>
              <div style={styles.pageSubtitle}>Histórico recente</div>
            </div>
            <div style={styles.tableCard}>
              <div style={styles.tableHeader}>
                <span>Contrato</span><span>Stake</span><span>Resultado</span><span>Status</span><span>Horário</span>
              </div>
              {trades.map((t, i) => (
                <div key={t.id || i} style={{ ...styles.tableRow, animationDelay: `${i * 0.03}s` }} className="fade-up">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{t.contract}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>${t.stake.toFixed(2)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: t.result >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {t.result >= 0 ? '+' : ''}${Math.abs(t.result).toFixed(2)}
                  </span>
                  <span>
                    <span style={{ ...styles.badge, ...(t.status === 'win' ? styles.badgeWin : styles.badgeLoss) }}>
                      {t.status === 'win' ? 'ganho' : 'perda'}
                    </span>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {t.time instanceof Date ? t.time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 2 && (
          <div className="fade-up">
            <div style={styles.pageHeader}>
              <div style={styles.pageTitle}>Sugestões de IA</div>
              <div style={styles.pageSubtitle}>Análise baseada no histórico real do robô</div>
            </div>
            <AIPanel metrics={metrics} trades={trades} />
          </div>
        )}

        {tab === 3 && (
          <div className="fade-up">
            <div style={styles.pageHeader}>
              <div style={styles.pageTitle}>Configurações</div>
              <div style={styles.pageSubtitle}>Alertas e preferências</div>
            </div>
            <SettingsPanel onLogout={onLogout} />
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    position: 'sticky',
    top: 0,
    height: '100vh',
    flexShrink: 0,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '2rem' },
  logoText: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  accountInfo: { marginBottom: '2rem', padding: '0.875rem', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' },
  accountId: { fontSize: 13, fontWeight: 500, color: 'var(--accent2)', fontFamily: 'var(--font-mono)', marginBottom: 2 },
  accountBal: { fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 },
  wsDot: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' },
  wsDotInner: { width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pulse 2s infinite' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', background: 'none', border: 'none',
    borderRadius: 8, color: 'var(--muted)', fontSize: 13,
    fontFamily: 'var(--font-display)', cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.15s',
  },
  navBtnActive: { background: 'rgba(124,92,252,0.12)', color: 'var(--accent2)', fontWeight: 500 },
  navIcon: { fontSize: 14, width: 18, textAlign: 'center' },
  sideFooter: { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' },
  sideLink: { fontSize: 12, color: 'var(--muted)', textDecoration: 'none' },
  main: { flex: 1, padding: '2rem', overflowY: 'auto', maxWidth: 900 },
  pageHeader: { marginBottom: '1.5rem' },
  pageTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: 'var(--muted)' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: '1.5rem' },
  chartCard: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' },
  chartTitle: { fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 },
  tableCard: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden' },
  tableHeader: { display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px 80px', gap: 8, padding: '10px 16px', background: 'var(--surface2)', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  tableRow: { display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px 80px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' },
  badge: { fontSize: 10, padding: '3px 8px', borderRadius: 6, fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' },
  badgeWin: { background: 'var(--green-dim)', color: 'var(--green)' },
  badgeLoss: { background: 'var(--red-dim)', color: 'var(--red)' },
}
