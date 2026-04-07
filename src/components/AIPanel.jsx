import { useState, useEffect } from 'react'
import { buildPrompt } from '../lib/analytics'
import { useRealtimeAI } from '../hooks/useRealtimeAI'

const PRIORITY_COLOR = {
  alta:  { bg: 'var(--red-dim)',        text: 'var(--red)'   },
  media: { bg: 'rgba(251,191,36,0.12)', text: 'var(--amber)' },
  baixa: { bg: 'var(--green-dim)',      text: 'var(--green)' },
}

const TRIGGER_LABEL = {
  loss_streak_3: '3 perdas seguidas',
  loss_streak_5: '5 perdas seguidas',
  winrate_drop:  'Win rate crítico',
  profit_neg:    'Perda acumulada',
  every_10:      'Checkpoint automático',
}

export default function AIPanel({ metrics, trades }) {
  const [subTab, setSubTab]     = useState('realtime')
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer]     = useState(null)
  const [askLoading, setAskLoading] = useState(false)

  const { feed, analyzing } = useRealtimeAI(trades)

  useEffect(() => {
    if (feed.length > 0) setSubTab('realtime')
  }, [feed.length])

  async function fetchSuggestions() {
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: buildPrompt(metrics) }],
        }),
      })
      const data = await res.json()
      const raw = data.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim()
      setSuggestions(JSON.parse(raw).suggestions || [])
    } catch {
      setSuggestions(getFallback(metrics))
    }
    setLoading(false)
  }

  async function askQuestion() {
    if (!question.trim()) return
    setAskLoading(true)
    setAnswer(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{ role: 'user', content: buildPrompt(metrics, question) }],
        }),
      })
      const data = await res.json()
      setAnswer(data.content.map(c => c.text || '').join(''))
    } catch {
      setAnswer('Não foi possível obter resposta. Verifique sua conexão.')
    }
    setAskLoading(false)
    setQuestion('')
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.subTabBar}>
        <SubTabBtn label="Tempo real" id="realtime" active={subTab} onClick={setSubTab} badge={feed.length || null} />
        <SubTabBtn label="Análise completa" id="full" active={subTab} onClick={setSubTab} />
        <SubTabBtn label="Perguntar" id="ask" active={subTab} onClick={setSubTab} />
      </div>

      {subTab === 'realtime' && (
        <div style={styles.section}>
          <div style={styles.feedHeader}>
            <div style={styles.headerLeft}>
              <div style={{ ...styles.aiDot, animationDuration: analyzing ? '0.6s' : '2s' }} />
              <span style={styles.headerTitle}>{analyzing ? 'Analisando...' : 'Monitoramento ativo'}</span>
            </div>
            <span style={styles.feedCount}>{feed.length} evento{feed.length !== 1 ? 's' : ''}</span>
          </div>

          {analyzing && <div style={styles.analyzingBar}><div style={styles.analyzingFill} /></div>}

          {feed.length === 0 && !analyzing && (
            <div style={styles.emptyFeed}>
              <div style={styles.emptyIcon}>◎</div>
              <div style={styles.emptyText}>Aguardando operações...</div>
              <div style={styles.emptySubtext}>
                A IA dispara sugestões automaticamente ao detectar: 3+ perdas seguidas, win rate abaixo de 40%, prejuízo acumulado, e a cada 10 operações.
              </div>
            </div>
          )}

          <div style={styles.feedList}>
            {feed.map((item, i) => {
              const p = PRIORITY_COLOR[item.priority] || PRIORITY_COLOR.media
              return (
                <div key={item.id} style={{ ...styles.feedCard, ...(i === 0 ? styles.feedCardNew : {}) }}
                  className={i === 0 ? 'fade-up' : ''}>
                  <div style={styles.feedMeta}>
                    <span style={{ ...styles.triggerBadge, background: p.bg, color: p.text }}>
                      {TRIGGER_LABEL[item.triggerLabel] || item.triggerLabel}
                    </span>
                    <span style={styles.feedTime}>
                      {item.ts?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div style={styles.feedTitle}>{item.title}</div>
                  <p style={styles.feedBody}>{item.body}</p>
                  <div style={styles.chips}>
                    {(item.chips || []).map((c, j) => <span key={j} style={styles.chip}>{c}</span>)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {subTab === 'full' && (
        <div style={styles.section}>
          <div style={styles.feedHeader}>
            <div style={styles.headerLeft}>
              <div style={styles.aiDot} />
              <span style={styles.headerTitle}>Análise completa do histórico</span>
            </div>
            <button style={styles.refreshBtn} onClick={fetchSuggestions} disabled={loading}>
              {loading ? '...' : '↻ Analisar'}
            </button>
          </div>

          {!suggestions && !loading && (
            <div style={styles.emptyFeed}>
              <div style={styles.emptyIcon}>✦</div>
              <div style={styles.emptyText}>Análise sob demanda</div>
              <div style={styles.emptySubtext}>Clique para gerar 3 sugestões detalhadas baseadas em todo o histórico do robô.</div>
              <button style={styles.analyzeBtn} onClick={fetchSuggestions}>Analisar agora →</button>
            </div>
          )}

          {loading && (
            <div style={styles.loadingWrap}>
              {[1,2,3].map(i => <div key={i} style={styles.skeletonCard} className="skeleton" />)}
            </div>
          )}

          {!loading && suggestions && (
            <div style={styles.feedList}>
              {suggestions.map((s, i) => {
                const p = PRIORITY_COLOR[s.priority] || PRIORITY_COLOR.media
                return (
                  <div key={i} style={styles.feedCard} className={`fade-up-delay-${Math.min(i, 3)}`}>
                    <div style={styles.feedMeta}>
                      <span style={{ ...styles.triggerBadge, background: p.bg, color: p.text }}>{s.priority}</span>
                    </div>
                    <div style={styles.feedTitle}>{s.title}</div>
                    <p style={styles.feedBody}>{s.body}</p>
                    <div style={styles.chips}>
                      {(s.chips || []).map((c, j) => <span key={j} style={styles.chip}>{c}</span>)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'ask' && (
        <div style={styles.section}>
          <div style={styles.askSection}>
            <div style={styles.askLabel}>Pergunte sobre o robô</div>
            <div style={styles.askRow}>
              <input
                style={styles.askInput}
                type="text"
                placeholder="Ex: por que estou perdendo? devo aumentar o stake?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askQuestion()}
              />
              <button style={styles.askBtn} onClick={askQuestion} disabled={askLoading || !question.trim()}>
                {askLoading ? '...' : '→'}
              </button>
            </div>
            <div style={styles.quickQuestions}>
              {['Por que estou perdendo?', 'Devo aumentar o stake?', 'Qual o melhor horário?', 'O Martingale está correto?'].map(q => (
                <button key={q} style={styles.quickBtn} onClick={() => setQuestion(q)}>{q}</button>
              ))}
            </div>
          </div>
          {answer && (
            <div style={styles.answerCard} className="fade-up">
              <div style={styles.answerLabel}>Resposta da IA</div>
              <p style={styles.answerText}>{answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SubTabBtn({ label, id, active, onClick, badge }) {
  const isActive = active === id
  return (
    <button style={{ ...styles.subTab, ...(isActive ? styles.subTabActive : {}) }} onClick={() => onClick(id)}>
      {label}
      {badge != null && <span style={styles.badge}>{badge}</span>}
    </button>
  )
}

function getFallback(m) {
  return [
    { title: 'Limitar Martingale', body: `${m.maxLossStreak} perdas consecutivas. Configure um limite de 3 níveis no Deriv Bot.`, priority: m.maxLossStreak >= 4 ? 'alta' : 'media', chips: ['Martingale', 'stop'] },
    { title: 'Revisar multiplicador', body: `Win rate ${m.winRate}% — reduza o multiplicador para 1.5x.`, priority: m.winRate < 45 ? 'alta' : 'media', chips: ['multiplicador', 'stake'] },
    { title: 'Diversificar símbolos', body: 'Distribua operações entre R_100, R_75 e R_50.', priority: 'baixa', chips: ['R_75', 'R_50'] },
  ]
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  subTabBar: { display: 'flex', gap: 4, background: 'var(--surface2)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' },
  subTab: { flex: 1, padding: '7px 10px', background: 'none', border: 'none', borderRadius: 7, color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-display)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' },
  subTabActive: { background: 'var(--surface)', color: 'var(--text)', fontWeight: 500 },
  badge: { background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, fontFamily: 'var(--font-mono)' },
  section: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  feedHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  aiDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s infinite' },
  headerTitle: { fontSize: 13, fontWeight: 500, color: 'var(--accent2)' },
  feedCount: { fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' },
  refreshBtn: { fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' },
  analyzingBar: { height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  analyzingFill: { height: '100%', width: '40%', background: 'var(--accent)', borderRadius: 2, animation: 'shimmer 1.2s infinite' },
  emptyFeed: { textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 },
  emptyIcon: { fontSize: 28, color: 'var(--muted)', marginBottom: 10 },
  emptyText: { fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 16px' },
  analyzeBtn: { padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-display)' },
  feedList: { display: 'flex', flexDirection: 'column', gap: 10 },
  feedCard: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '1rem 1.25rem' },
  feedCardNew: { border: '1px solid rgba(124,92,252,0.4)', boxShadow: '0 0 0 1px rgba(124,92,252,0.08)' },
  feedMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  triggerBadge: { fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' },
  feedTime: { fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' },
  feedTitle: { fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 6 },
  feedBody: { fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { fontSize: 11, padding: '3px 10px', background: 'rgba(124,92,252,0.12)', color: 'var(--accent2)', borderRadius: 6, fontFamily: 'var(--font-mono)' },
  loadingWrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  skeletonCard: { height: 120, borderRadius: 12 },
  askSection: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '1rem 1.25rem' },
  askLabel: { fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  askRow: { display: 'flex', gap: 8, marginBottom: 10 },
  askInput: { flex: 1, padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-display)', outline: 'none' },
  askBtn: { padding: '9px 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 700 },
  quickQuestions: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  quickBtn: { fontSize: 12, padding: '5px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-display)' },
  answerCard: { background: 'rgba(124,92,252,0.07)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 10, padding: '0.875rem 1rem' },
  answerLabel: { fontSize: 10, color: 'var(--accent2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  answerText: { fontSize: 13, color: 'var(--text)', lineHeight: 1.7 },
}
