import { useState } from 'react'
import { sendTelegramAlert } from '../lib/telegram'

export default function SettingsPanel({ onLogout }) {
  const [botToken, setBotToken] = useState(localStorage.getItem('tg_bot_token') || '')
  const [chatId, setChatId] = useState(localStorage.getItem('tg_chat_id') || '')
  const [testStatus, setTestStatus] = useState(null)
  const [saved, setSaved] = useState(false)

  function save() {
    localStorage.setItem('tg_bot_token', botToken)
    localStorage.setItem('tg_chat_id', chatId)
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  async function testAlert() {
    setTestStatus('sending')
    const ok = await sendTelegramAlert('✅ <b>Deriv Monitor conectado!</b>\n\nAlertas do Comet V5.1 chegam aqui automaticamente.')
    setTestStatus(ok ? 'ok' : 'error'); setTimeout(() => setTestStatus(null), 3000)
  }

  const S = { section: { background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:12,padding:'1.25rem',marginBottom:'1rem' }, title: { fontSize:13,fontWeight:500,color:'var(--accent2)',fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'1rem' }, label: { display:'block',fontSize:11,color:'var(--muted)',marginBottom:6,fontFamily:'var(--font-mono)',textTransform:'uppercase',letterSpacing:'0.06em' }, input: { width:'100%',padding:'9px 12px',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:8,color:'var(--text)',fontSize:13,fontFamily:'var(--font-mono)',outline:'none',marginBottom:12 }, btn: { padding:'9px 18px',background:'var(--accent)',border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'var(--font-display)',marginRight:8 } }

  return (
    <div>
      <div style={S.section}>
        <div style={S.title}>Alertas no Telegram</div>
        <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,marginBottom:'1rem'}}>Configure seu bot do Telegram para receber alertas automáticos do Comet V5.1.</p>
        <div style={{fontSize:13,color:'var(--muted)',marginBottom:'1rem',lineHeight:1.8}}>
          1. Abra o Telegram → busque <code style={{background:'var(--surface2)',padding:'1px 5px',borderRadius:3,fontFamily:'var(--font-mono)',fontSize:12}}>@BotFather</code><br/>
          2. Envie <code style={{background:'var(--surface2)',padding:'1px 5px',borderRadius:3,fontFamily:'var(--font-mono)',fontSize:12}}>/newbot</code> e siga as instruções<br/>
          3. Copie o token do bot criado<br/>
          4. Acesse <code style={{background:'var(--surface2)',padding:'1px 5px',borderRadius:3,fontFamily:'var(--font-mono)',fontSize:12}}>api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> para ver o Chat ID
        </div>
        <label style={S.label}>Bot Token</label>
        <input style={S.input} value={botToken} onChange={e=>setBotToken(e.target.value)} placeholder="1234567890:ABCDEFabcdef..." />
        <label style={S.label}>Chat ID</label>
        <input style={S.input} value={chatId} onChange={e=>setChatId(e.target.value)} placeholder="-1001234567890" />
        <div style={{display:'flex',gap:8,marginTop:4}}>
          <button style={S.btn} onClick={save}>{saved?'✓ Salvo':'Salvar'}</button>
          <button style={{...S.btn,background:'transparent',border:'1px solid var(--border2)',color:'var(--text)'}} onClick={testAlert} disabled={!botToken||!chatId}>
            {testStatus==='sending'?'Enviando...':testStatus==='ok'?'✓ Enviado!':testStatus==='error'?'✗ Erro':'Enviar teste'}
          </button>
        </div>
      </div>

      <div style={S.section}>
        <div style={S.title}>Regras de alerta automático</div>
        {[['🔴','Sequência ≥ 5 perdas','Alerta crítico imediato'],['🟡','Win rate < 40% (mín. 10 ops)','Alerta de atenção'],['🔴','Perda acumulada > $50','Alerta crítico'],['🟡','Fator de lucro < 0.8','Alerta de atenção']].map(([icon,label,desc])=>(
          <div key={label} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:16}}>{icon}</span>
            <div><div style={{fontSize:13,fontWeight:500,marginBottom:2}}>{label}</div><div style={{fontSize:12,color:'var(--muted)'}}>{desc}</div></div>
          </div>
        ))}
      </div>

      <div style={S.section}>
        <div style={S.title}>Conta</div>
        <button style={{...S.btn,background:'var(--red-dim)',color:'var(--red)',border:'1px solid rgba(255,77,109,0.2)'}} onClick={onLogout}>Desconectar conta</button>
      </div>
    </div>
  )
}
