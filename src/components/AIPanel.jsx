import { useState, useEffect } from 'react'
import { buildPrompt } from '../lib/analytics'
import { useRealtimeAI } from '../hooks/useRealtimeAI'

const PRIORITY_COLOR = {
  alta:  { bg: 'var(--red-dim)',              text: 'var(--red)'   },
  media: { bg: 'rgba(251,191,36,0.12)',       text: 'var(--amber)' },
  baixa: { bg: 'var(--green-dim)',            text: 'var(--green)' },
}
const TRIGGER_LABEL = {
  loss_streak_3: '3 perdas seguidas', loss_streak_5: '5 perdas seguidas',
  winrate_drop: 'Win rate crítico', profit_neg: 'Perda acumulada', every_10: 'Checkpoint automático',
}

export default function AIPanel({ metrics, trades }) {
  const [subTab, setSubTab] = useState('realtime')
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [askLoading, setAskLoading] = useState(false)
  const { feed, analyzing } = useRealtimeAI(trades)

  useEffect(() => { if (feed.length > 0) setSubTab('realtime') }, [feed.length])

  async function fetchSuggestions() {
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: buildPrompt(metrics) }] }),
      })
      const data = await res.json()
      const raw = data.content.map(c => c.text || '').join('').replace(/```json|```/g, '').trim()
      setSuggestions(JSON.parse(raw).suggestions || [])
    } catch { setSuggestions(getFallback(metrics)) }
    setLoading(false)
  }

  async function askQuestion() {
    if (!question.trim()) return
    setAskLoading(true); setAnswer(null)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, messages: [{ role: 'user', content: buildPrompt(metrics, question) }] }),
      })
      const data = await res.json()
      setAnswer(data.content.map(c => c.text || '').join(''))
    } catch { setAnswer('Não foi possível obter resposta. Verifique sua conexão.') }
    setAskLoading(false); setQuestion('')
  }

  const S = styles
  return (
    <div style={S.wrap}>
      <div style={S.subTabBar}>
        {[['realtime','Tempo real'], ['full','Análise completa'], ['ask','Perguntar']].map(([id, label]) => (
          <button key={id} style={{...S.subTab, ...(subTab===id ? S.subTabActive : {})}} onClick={() => setSubTab(id)}>
            {label}{id==='realtime' && feed.length > 0 && <span style={S.badge}>{feed.length}</span>}
          </button>
        ))}
      </div>

      {subTab === 'realtime' && (
        <div style={S.section}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--accent)',animation:'pulse 2s infinite'}} />
              <span style={{fontSize:13,fontWeight:500,color:'var(--accent2)'}}>{analyzing ? 'Analisando...' : 'Monitoramento ativo'}</span>
            </div>
            <span style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--font-mono)'}}>{feed.length} evento{feed.length!==1?'s':''}</span>
          </div>
          {analyzing && <div style={{height:2,background:'var(--border)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',width:'40%',background:'var(--accent)',borderRadius:2,animation:'shimmer 1.2s infinite'}} /></div>}
          {feed.length === 0 && !analyzing && (
            <div style={S.emptyFeed}>
              <div style={{fontSize:28,color:'var(--muted)',marginBottom:10}}>◎</div>
              <div style={{fontSize:14,fontWeight:500,marginBottom:8}}>Aguardando operações...</div>
              <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,maxWidth:380,margin:'0 auto'}}>A IA dispara sugestões ao detectar: 3+ perdas seguidas, win rate abaixo de 40%, prejuízo acumulado, e a cada 10 operações.</div>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {feed.map((item, i) => {
              const p = PRIORITY_COLOR[item.priority] || PRIORITY_COLOR.media
              return (
                <div key={item.id} style={{...S.feedCard, ...(i===0?S.feedCardNew:{})}} className={i===0?'fade-up':''}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{...S.triggerBadge, background:p.bg, color:p.text}}>{TRIGGER_LABEL[item.triggerLabel]||item.triggerLabel}</span>
                    <span style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--font-mono)'}}>{item.ts?.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:500,marginBottom:6}}>{item.title}</div>
                  <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,marginBottom:10}}>{item.body}</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{(item.chips||[]).map((c,j)=><span key={j} style={S.chip}>{c}</span>)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {subTab === 'full' && (
        <div style={S.section}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:13,fontWeight:500,color:'var(--accent2)'}}>Análise completa do histórico</span>
            <button style={{fontSize:12,color:'var(--muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-mono)'}} onClick={fetchSuggestions} disabled={loading}>{loading?'...':'↻ Analisar'}</button>
          </div>
          {!suggestions && !loading && (
            <div style={S.emptyFeed}>
              <div style={{fontSize:28,color:'var(--muted)',marginBottom:10}}>✦</div>
              <div style={{fontSize:14,fontWeight:500,marginBottom:8}}>Análise sob demanda</div>
              <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,maxWidth:380,margin:'0 auto 16px'}}>Gera 3 sugestões detalhadas baseadas em todo o histórico do Comet V5.1.</div>
              <button style={S.analyzeBtn} onClick={fetchSuggestions}>Analisar agora →</button>
            </div>
          )}
          {loading && <div style={{display:'flex',flexDirection:'column',gap:12}}>{[1,2,3].map(i=><div key={i} style={{height:120,borderRadius:12}} className="skeleton" />)}</div>}
          {!loading && suggestions && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {suggestions.map((s, i) => {
                const p = PRIORITY_COLOR[s.priority]||PRIORITY_COLOR.media
                return (
                  <div key={i} style={S.feedCard} className={`fade-up-delay-${Math.min(i,3)}`}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <span style={{...S.triggerBadge,background:p.bg,color:p.text}}>{s.priority}</span>
                    </div>
                    <div style={{fontSize:14,fontWeight:500,marginBottom:6}}>{s.title}</div>
                    <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,marginBottom:10}}>{s.body}</p>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>{(s.chips||[]).map((c,j)=><span key={j} style={S.chip}>{c}</span>)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {subTab === 'ask' && (
        <div style={S.section}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'1rem 1.25rem'}}>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:10,fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Pergunte sobre o Comet V5.1</div>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <input style={{flex:1,padding:'9px 12px',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,color:'var(--text)',fontSize:13,fontFamily:'var(--font-display)',outline:'none'}}
                type="text" placeholder="Ex: por que estou perdendo? devo aumentar o stake?"
                value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&askQuestion()} />
              <button style={{padding:'9px 16px',background:'var(--accent)',border:'none',borderRadius:8,color:'#fff',fontSize:16,cursor:'pointer',fontWeight:700}} onClick={askQuestion} disabled={askLoading||!question.trim()}>{askLoading?'...':'→'}</button>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {['Por que estou perdendo?','Devo aumentar o stake?','A Distância Mínima está ok?','O Martingale está correto?'].map(q=>(
                <button key={q} style={{fontSize:12,padding:'5px 10px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:6,color:'var(--muted)',cursor:'pointer',fontFamily:'var(--font-display)'}} onClick={()=>setQuestion(q)}>{q}</button>
              ))}
            </div>
          </div>
          {answer && (
            <div style={{background:'rgba(124,92,252,0.07)',border:'1px solid rgba(124,92,252,0.2)',borderRadius:10,padding:'0.875rem 1rem'}} className="fade-up">
              <div style={{fontSize:10,color:'var(--accent2)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Resposta da IA</div>
              <p style={{fontSize:13,color:'var(--text)',lineHeight:1.7}}>{answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getFallback(m) {
  return [
    { title: 'Verificar Distância Mínima', body: `Win rate ${m.winRate}% — em mercado lateral no R_25 a Distância Mínima 0.0085 pode estar gerando entradas fracas. Teste aumentar para 0.010.`, priority: 'media', chips: ['Distância Mínima', 'R_25'] },
    { title: 'Revisar Execuções', body: 'Com 3 confirmações de tick, o robô pode perder o início do movimento. Teste reduzir para 2 execuções e compare o win rate.', priority: 'media', chips: ['Execuções', 'timing'] },
    { title: 'Stop por sequência', body: `Máximo de ${m.maxLossStreak} losses seguidos detectado. Adicione bloco de parada após 5 losses consecutivos para proteger o saldo.`, priority: m.maxLossStreak >= 4 ? 'alta' : 'baixa', chips: ['stop loss', 'proteção'] },
  ]
}

const styles = {
  wrap: { display:'flex',flexDirection:'column',gap:'1rem' },
  subTabBar: { display:'flex',gap:4,background:'var(--surface2)',padding:4,borderRadius:10,border:'1px solid var(--border)' },
  subTab: { flex:1,padding:'7px 10px',background:'none',border:'none',borderRadius:7,color:'var(--muted)',fontSize:13,fontFamily:'var(--font-display)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6 },
  subTabActive: { background:'var(--surface)',color:'var(--text)',fontWeight:500 },
  badge: { background:'var(--accent)',color:'#fff',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:10,fontFamily:'var(--font-mono)' },
  section: { display:'flex',flexDirection:'column',gap:'1rem' },
  emptyFeed: { textAlign:'center',padding:'2.5rem 1rem',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12 },
  analyzeBtn: { padding:'9px 20px',background:'var(--accent)',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)' },
  feedCard: { background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'1rem 1.25rem' },
  feedCardNew: { border:'1px solid rgba(124,92,252,0.4)',boxShadow:'0 0 0 1px rgba(124,92,252,0.08)' },
  triggerBadge: { fontSize:10,fontWeight:500,padding:'3px 8px',borderRadius:6,textTransform:'uppercase',letterSpacing:'0.06em',fontFamily:'var(--font-mono)' },
  chip: { fontSize:11,padding:'3px 10px',background:'rgba(124,92,252,0.12)',color:'var(--accent2)',borderRadius:6,fontFamily:'var(--font-mono)' },
}
