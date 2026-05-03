export default function MetricCard({ label, value, sub, accent }) {
  const color = accent === 'green' ? 'var(--green)' : accent === 'red' ? 'var(--red)' : accent === 'amber' ? 'var(--amber)' : 'var(--text)'
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: 4, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
