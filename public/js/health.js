let healthDate = new Date().toISOString().slice(0, 10)

function formatHealthDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function changeHealthDate(delta) {
  const d = new Date(healthDate + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  healthDate = d.toISOString().slice(0, 10)
  loadHealthData()
}

async function loadHealthStatus() {
  try {
    const res = await fetch(`${API}/wearables/status`, { headers: { 'Authorization': `Bearer ${token}` } })
    const platforms = await res.json()
    platforms.forEach(p => {
      const statusEl = document.getElementById(`status-${p.platform}`)
      const btnEl    = document.getElementById(`btn-${p.platform}`)
      if (statusEl) { statusEl.textContent = 'Connected'; statusEl.className = 'wearable-status connected' }
      if (btnEl)    { btnEl.textContent = 'Reconnect'; btnEl.classList.add('connected-btn') }
    })
  } catch (err) { console.error('Failed to load wearable status:', err) }
}

async function loadHealthData() {
  document.getElementById('health-date-label').textContent = formatHealthDate(healthDate)
  try {
    const res = await fetch(`${API}/wearables/data?date=${healthDate}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const rows = await res.json()
    const merged = { steps: null, heart_rate_avg: null, calories_burned: null, sleep_hours: null }
    rows.forEach(row => {
      Object.keys(merged).forEach(k => { if (merged[k] === null && row[k] != null) merged[k] = row[k] })
    })
    document.getElementById('hstat-steps').textContent = merged.steps ? merged.steps.toLocaleString() : '—'
    document.getElementById('hstat-hr').textContent    = merged.heart_rate_avg ? `${merged.heart_rate_avg} bpm` : '—'
    document.getElementById('hstat-cal').textContent   = merged.calories_burned ? merged.calories_burned.toLocaleString() : '—'
    document.getElementById('hstat-sleep').textContent = merged.sleep_hours ? parseFloat(merged.sleep_hours).toFixed(1) : '—'
  } catch (err) { console.error('Failed to load health data:', err) }
}

function connectPlatform(platform) {
  const t = localStorage.getItem('athlete_token')
  window.location.href = `${API}/wearables/connect/${platform}?token=${t}`
}

async function importAppleHealth(event) {
  const file = event.target.files[0]
  if (!file) return
  const formData = new FormData()
  formData.append('healthExport', file)
  try {
    const res = await fetch(`${API}/wearables/import/apple`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    const data = await res.json()
    alert(`✅ Imported ${data.daysImported} days of Apple Health data`)
    const statusEl = document.getElementById('status-apple')
    if (statusEl) { statusEl.textContent = 'Imported'; statusEl.className = 'wearable-status connected' }
    loadHealthData()
  } catch { alert('Failed to import Apple Health data') }
}
