// ── CSV Export ─────────────────────────────────────────────────────────────
function exportWorkoutsCSV() {
  const a = document.createElement('a')
  a.href = `${API}/workouts/export/csv`
  // Pass token in query param since file downloads can't use headers easily
  a.href = `${API}/workouts/export/csv?token=${encodeURIComponent(token)}`
  a.download = 'workout-history.csv'
  a.click()
}

// ── Combine Card (Canvas PNG) ──────────────────────────────────────────────
async function generateCombineCard() {
  // Fetch PR records and profile
  let prs = [], profileName = '', sport = ''
  try {
    const [prRes, profRes] = await Promise.all([
      fetch(`${API}/performance/records`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/profile`,             { headers: { Authorization: `Bearer ${token}` } })
    ])
    prs = await prRes.json()
    const prof = await profRes.json()
    const p = prof.profile || prof
    profileName = p.full_name || 'Athlete'
    sport = p.sport || ''
  } catch (err) { alert('Failed to load data for card'); return }

  if (!prs.length) { alert('Log some performance tests first to generate your combine card.'); return }

  const canvas = document.getElementById('combine-card-canvas')
  const CARD_W = 600
  const CARD_H = Math.max(440, 200 + prs.length * 52)
  canvas.width  = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Top accent gradient
  const grad = ctx.createLinearGradient(0, 0, CARD_W, 0)
  grad.addColorStop(0, 'transparent')
  grad.addColorStop(0.4, '#c8ff00')
  grad.addColorStop(0.6, '#c8ff00')
  grad.addColorStop(1, 'transparent')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CARD_W, 3)

  // "COMBINE CARD" title
  ctx.fillStyle = '#c8ff00'
  ctx.font = 'bold 42px Arial, sans-serif'
  ctx.letterSpacing = '4px'
  ctx.fillText('COMBINE CARD', 40, 65)

  // Athlete name
  ctx.fillStyle = '#f0f0f0'
  ctx.font = '500 22px Arial, sans-serif'
  ctx.fillText(profileName, 40, 100)

  // Sport badge
  if (sport) {
    ctx.fillStyle = 'rgba(200,255,0,0.12)'
    const sportW = ctx.measureText(sport).width + 24
    ctx.beginPath()
    ctx.roundRect(40, 110, sportW, 24, 4)
    ctx.fill()
    ctx.fillStyle = '#c8ff00'
    ctx.font = '600 12px Arial, sans-serif'
    ctx.fillText(sport.toUpperCase(), 52, 126)
  }

  // Divider
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(40, 148, CARD_W - 80, 1)

  // PR rows
  prs.forEach((pr, i) => {
    const y = 178 + i * 52
    const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
    ctx.fillStyle = rowBg
    ctx.fillRect(32, y - 16, CARD_W - 64, 44)

    ctx.fillStyle = '#9999b0'
    ctx.font = '500 13px Arial, sans-serif'
    ctx.fillText((pr.measurement_name || '').toUpperCase(), 44, y + 4)

    ctx.fillStyle = '#f0f0f0'
    ctx.font = 'bold 24px Arial, sans-serif'
    const valStr = String(pr.value)
    const valW = ctx.measureText(valStr).width
    ctx.fillText(valStr, CARD_W - 140, y + 6)

    ctx.fillStyle = '#666680'
    ctx.font = '400 14px Arial, sans-serif'
    ctx.fillText(pr.default_unit || pr.unit || '', CARD_W - 140 + valW + 6, y + 6)
  })

  // Bottom divider
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fillRect(40, CARD_H - 44, CARD_W - 80, 1)

  // Footer
  ctx.fillStyle = '#444460'
  ctx.font = '400 13px Arial, sans-serif'
  ctx.fillText('Athlete App • athleteapp.io', 44, CARD_H - 20)
  ctx.fillStyle = '#666680'
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const dateW = ctx.measureText(dateStr).width
  ctx.fillText(dateStr, CARD_W - 40 - dateW, CARD_H - 20)

  // Download
  const link = document.createElement('a')
  link.download = `${profileName.replace(/\s+/g, '-').toLowerCase()}-combine-card.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
