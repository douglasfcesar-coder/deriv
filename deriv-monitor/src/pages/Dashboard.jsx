import { useState, useEffect, useRef } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import MetricCard from '../components/MetricCard'
import AIPanel from '../components/AIPanel'
import SettingsPanel from '../components/SettingsPanel'
import { calcMetrics, getAlertStatus } from '../lib/analytics'
import { sendTelegramAlert, buildAlertMessage } from '../lib/telegram'

const TABS = [['▦','Visão geral'],['≡','Operações'],['✦','IA'],['⚙','Config']]

export default function Dashboard({ account, balance, trades, wsStatus, onLogout }) {
  const [tab, setTab] = useState(0)
  const metrics = calcMetrics(trades)
  const sentAlerts = useRef(new Set())

  const equityCurve = trades.slice().reverse().reduce((acc, t) => {
    const prev = acc.length ? acc[acc.length-1].equity : 0
    acc.push({ equity: +(prev+t.result).toFixed(2), time: t.time instanceof Date ? t.time.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '' })
    return acc
  }, [])

  useEffect(() => {
    getAlertStatus(metrics).forEach(alert => {
      if (!sentAlerts.current.has(alert.msg)) {
        sentAlerts.current.add(alert.msg)
        sendTelegramAlert(buildAlertMessage(alert, metrics))
      }
    })
  }, [trades.length])

  const metricAccent = (val, good, bad) => val >= good ? 'green' : val <= bad ? 'red' : 'amber'
  const fmtBal = (v, cur) => v != null ? v.toLocaleString('pt-BR',{style:'currency',currency:cur||'USD',minimumFractionDigits:2}) : '—'
  const fmtProfit = v => (v>=0?'+':'')+v.toLocaleString('pt-BR',{style:'currency',currency:'USD',minimumFractionDigits:2})

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      {/* Sidebar */}
      <aside style={{width:220,minHeight:'100vh',background:'var(--surface)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',padding:'1.5rem 1rem',position:'sticky',top:0,height:'100vh',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'2rem'}}>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none"><path d="M4 14l5-5 5 5 5-10 5 10" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{fontSize:14,fontWeight:700}}>Deriv Monitor</span>
        </div>

        <div style={{marginBottom:'2rem',padding:'0.875rem',background:'var(--surface2)',borderRadius:10,border:'1px solid var(--border)'}}>
          <div style={{fontSize:13,fontWeight:500,color:'var(--accent2)',fontFamily:'var(--font-mono)',marginBottom:2}}>{account?.loginid||'—'}</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:6}}>
            {balance != null ? fmtBal(balance, account?.currency) : wsStatus==='connecting'?'Conectando...':'—'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:wsStatus==='connected'?'var(--green)':wsStatus==='connecting'?'var(--amber)':'#555',animation:'pulse 2s infinite',flexShrink:0}} />
            <span style={{fontSize:11,color:'var(--muted)'}}>{wsStatus==='connected'?'ao vivo':wsStatus==='connecting'?'conectando...':'demo'}</span>
          </div>
        </div>

        <nav style={{display:'flex',flexDirection:'column',gap:4,flex:1}}>
          {TABS.map(([icon,label],i)=>(
            <button key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:tab===i?'rgba(124,92,252,0.12)':'none',border:'none',borderRadius:8,color:tab===i?'var(--accent2)':'var(--muted)',fontSize:13,fontFamily:'var(--font-display)',fontWeight:tab===i?500:400,cursor:'pointer',textAlign:'left'}} onClick={()=>setTab(i)}>
              <span style={{fontSize:14,width:18,textAlign:'center'}}>{icon}</span>{label}
            </button>
          ))}
        </nav>

        <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--border)'}}>
          <a href="https://app.deriv.com" target="_blank" rel="noreferrer" style={{fontSize:12,color:'var(--muted)',textDecoration:'none'}}>Abrir Deriv →</a>
        </div>
      </aside>

      {/* Main content */}
      <main style={{flex:1,padding:'2rem',overflowY:'auto',maxWidth:900}}>

        {tab === 0 && (
          <div className="fade-up">
            <div style={{marginBottom:'1.5rem'}}>
              <div style={{fontSize:22,fontWeight:700,marginBottom:4}}>Visão geral</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>{metrics.total} operações analisadas — Comet V5.1</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginBottom:'1.5rem'}}>
              <MetricCard label="Lucro total" value={fmtProfit(metrics.profit)} accent={metrics.profit>=0?'green':'red'} />
              <MetricCard label="Win rate" value={metrics.winRate+'%'} accent={metricAccent(metrics.winRate,55,40)} sub={`${metrics.wins}W / ${metrics.losses}L`} />
              <MetricCard label="Fator de lucro" value={metrics.profitFactor+'x'} accent={metricAccent(metrics.profitFactor,1.2,0.9)} />
              <MetricCard label="Seq. max. perdas" value={metrics.maxLossStreak} accent={metrics.maxLossStreak>=5?'red':metrics.maxLossStreak>=3?'amber':'green'} sub="consecutivas" />
              <MetricCard label="Ganho médio" value={`$${metrics.avgWin}`} accent="green" />
              <MetricCard label="Perda média" value={`$${metrics.avgLoss}`} accent="red" />
            </div>
            {equityCurve.length > 2 && (
              <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'1.25rem',marginBottom:'1.5rem'}}>
                <div style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>Curva de equity</div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={equityCurve} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.3}/><stop offset="95%" stopColor="#7c5cfc" stopOpacity={0}/></linearGradient></defs>
                    <XAxis dataKey="time" tick={{fill:'#6b6b80',fontSize:10}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fill:'#6b6b80',fontSize:10}} tickLine={false} axisLine={false} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                    <Tooltip contentStyle={{background:'#17171f',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#f0f0f5',fontSize:12}} />
                    <Area type="monotone" dataKey="equity" stroke="#7c5cfc" strokeWidth={2} fill="url(#eq)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'1.25rem'}}>
              <div style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>Robô ativo</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13}}>
                {[['Nome','Comet V5.1'],['Mercado','R_25 Volatility'],['Tipo','Only Ups / Only Downs'],['Ticks','3 ticks'],['Stake','$0,36'],['Dist. Mínima','0.0085'],['Vela','120 segundos'],['Martingale','1,20x após 3 losses']].map(([k,v])=>(
                  <><div style={{color:'var(--muted)'}}>{k}</div><div style={{fontFamily:'var(--font-mono)',fontSize:12}}>{v}</div></>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div className="fade-up">
            <div style={{marginBottom:'1.5rem'}}>
              <div style={{fontSize:22,fontWeight:700,marginBottom:4}}>Operações</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Histórico recente em tempo real</div>
            </div>
            <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 80px 100px 80px 80px',gap:8,padding:'10px 16px',background:'var(--surface2)',fontSize:11,color:'var(--muted)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                <span>Contrato</span><span>Stake</span><span>Resultado</span><span>Status</span><span>Horário</span>
              </div>
              {trades.length === 0 && <div style={{padding:'2rem',textAlign:'center',color:'var(--muted)',fontSize:13}}>Aguardando operações...</div>}
              {trades.map((t, i) => (
                <div key={t.id||i} style={{display:'grid',gridTemplateColumns:'2fr 80px 100px 80px 80px',gap:8,padding:'10px 16px',borderBottom:'1px solid var(--border)',alignItems:'center'}} className="fade-up">
                  <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--muted)'}}>{t.contract}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:12}}>${t.stake.toFixed(2)}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:t.result>=0?'var(--green)':'var(--red)'}}>{t.result>=0?'+':''}${Math.abs(t.result).toFixed(2)}</span>
                  <span><span style={{fontSize:10,padding:'3px 8px',borderRadius:6,fontFamily:'var(--font-mono)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.06em',background:t.status==='win'?'var(--green-dim)':'var(--red-dim)',color:t.status==='win'?'var(--green)':'var(--red)'}}>{t.status==='win'?'ganho':'perda'}</span></span>
                  <span style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--font-mono)'}}>{t.time instanceof Date?t.time.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 2 && (
          <div className="fade-up">
            <div style={{marginBottom:'1.5rem'}}>
              <div style={{fontSize:22,fontWeight:700,marginBottom:4}}>Sugestões de IA</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Análise baseada no histórico real do Comet V5.1</div>
            </div>
            <AIPanel metrics={metrics} trades={trades} />
          </div>
        )}

        {tab === 3 && (
          <div className="fade-up">
            <div style={{marginBottom:'1.5rem'}}>
              <div style={{fontSize:22,fontWeight:700,marginBottom:4}}>Configurações</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Alertas e preferências</div>
            </div>
            <SettingsPanel onLogout={onLogout} />
          </div>
        )}
      </main>
    </div>
  )
}
