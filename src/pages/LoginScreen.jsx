import { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  function handleLogin() {
    if (!token.trim()) return
    setLoading(true)
    setTimeout(() => onLogin(token.trim()), 300)
  }

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'2rem 1rem',background:'var(--bg)' }}>
      <div style={{ width:'100%',maxWidth:400,background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:16,padding:'2.5rem 2rem' }} className="fade-up">
        <div style={{ width:52,height:52,background:'rgba(124,92,252,0.15)',border:'1px solid rgba(124,92,252,0.3)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1.25rem' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 14l5-5 5 5 5-10 5 10" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1 style={{ fontFamily:'var(--font-display)',fontSize:22,fontWeight:700,marginBottom:6 }}>Deriv Monitor</h1>
        <p style={{ fontSize:13,color:'var(--muted)',marginBottom:'2rem',lineHeight:1.5 }}>Acompanhe o Comet V5.1 com inteligência artificial</p>

        <label style={{ display:'block',fontSize:12,fontWeight:500,color:'var(--muted)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:'var(--font-mono)' }}>API Token da Deriv</label>
        <input style={{ width:'100%',padding:'10px 14px',background:'var(--bg)',border:'1px solid var(--border2)',borderRadius:10,color:'var(--text)',fontSize:14,fontFamily:'var(--font-mono)',outline:'none',marginBottom:6 }}
          type="password" placeholder="Cole seu token aqui..." value={token}
          onChange={e=>setToken(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
        <span style={{ fontSize:11,color:'var(--muted)',display:'block',marginBottom:'1.25rem' }}>
          Deriv → Configurações → Tokens de API → permissão: Read
        </span>

        <button style={{ width:'100%',padding:'11px 16px',background:'var(--accent)',border:'none',borderRadius:10,color:'#fff',fontSize:14,fontFamily:'var(--font-display)',fontWeight:500,cursor:'pointer',marginBottom:'0.75rem' }}
          onClick={handleLogin} disabled={loading||!token}>{loading?'Conectando...':'Conectar à Deriv →'}</button>

        <div style={{ textAlign:'center',fontSize:12,color:'var(--muted)',margin:'0.75rem 0' }}>ou</div>

        <button style={{ width:'100%',padding:'11px 16px',background:'transparent',border:'1px solid var(--border2)',borderRadius:10,color:'var(--text)',fontSize:14,fontFamily:'var(--font-display)',fontWeight:500,cursor:'pointer' }}
          onClick={()=>onLogin('__demo__')}>Explorar com dados de demo</button>

        <p style={{ marginTop:'1.5rem',fontSize:11,color:'var(--muted)',textAlign:'center',lineHeight:1.6 }}>
          Seu token é usado apenas localmente. Conexão direta com a Deriv via WebSocket.
        </p>
      </div>
    </div>
  )
}
