export default function MetricCard({ label, value, sub, accent }) {
  const color = accent === 'green' ? 'var(--green)' : accent === 'red' ? 'var(--red)' : accent === 'amber' ? 'var(--amber)' : 'var(--text)'
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={{ ...styles.value, color }}>{value}</div>
      {sub && <div style={styles.sub}>{sub}</div>}
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '1rem',
  },
  label: {
    fontSize: 11,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontFamily: 'var(--font-mono)',
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    lineHeight: 1,
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 4,
  },
}
