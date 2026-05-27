// ── Sport change ──────────────────────────────────────────────────────────
function handleSportChange() {
  const sport = document.getElementById('log-sport').value
  renderSportStats(sport)
  loadSessionTypes(sport)
}

// ── Session Types ─────────────────────────────────────────────────────────
async function loadSessionTypes(sport) {
  const container = document.getElementById('sessionTypeContainer')
  if (!sport) { container.innerHTML = ''; sessionTypes = []; return }
  try {
    const res = await fetch(`${API}/session-types?sport=${encodeURIComponent(sport)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    sessionTypes = await res.json()
    renderSessionTypeDropdown(sport)
  } catch (err) { console.error('Failed to load session types:', err) }
}

function renderSessionTypeDropdown(sport) {
  const container = document.getElementById('sessionTypeContainer')
  if (!container) return
  const defaults = sessionTypes.filter(s => s.type === 'default')
  const customs = sessionTypes.filter(s => s.type === 'custom')
  let optionsHTML = `<option value="">-- Select session type --</option>`
  if (defaults.length) {
    optionsHTML += `<optgroup label="Standard">`
    defaults.forEach(s => { optionsHTML += `<option value="${s.id}">${s.name}</option>` })
    optionsHTML += `</optgroup>`
  }
  if (customs.length) {
    optionsHTML += `<optgroup label="My Custom Types">`
    customs.forEach(s => { optionsHTML += `<option value="${s.id}">${s.name}</option>` })
    optionsHTML += `</optgroup>`
  }
  optionsHTML += `<option value="__add_new__">＋ Add custom type…</option>`
  container.innerHTML = `
    <div class="form-group">
      <label>Session Type</label>
      <select id="sessionTypeSelect" onchange="handleSessionTypeChange(this)">${optionsHTML}</select>
    </div>
    <div id="customSessionTypeForm" style="display:none;" class="custom-type-form">
      <label>New Session Type Name</label>
      <div class="input-row">
        <input type="text" id="customSessionTypeName" placeholder="e.g. Two-a-Days…" maxlength="100"/>
        <button type="button" class="btn-save-type" onclick="saveCustomSessionType('${sport}')">Save</button>
        <button type="button" class="btn-cancel-type" onclick="cancelCustomSessionType()">Cancel</button>
      </div>
      <span id="customTypeError" class="error-msg" style="display:none;"></span>
    </div>`
}

function handleSessionTypeChange(select) {
  const customForm = document.getElementById('customSessionTypeForm')
  if (select.value === '__add_new__') { customForm.style.display = 'block'; document.getElementById('customSessionTypeName').focus() }
  else { customForm.style.display = 'none' }
}

async function saveCustomSessionType(sport) {
  const nameInput = document.getElementById('customSessionTypeName')
  const errorEl = document.getElementById('customTypeError')
  const name = nameInput.value.trim()
  if (!name) { errorEl.textContent = 'Please enter a name.'; errorEl.style.display = 'block'; return }
  try {
    const res = await fetch(`${API}/session-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ sport, name })
    })
    const data = await res.json()
    if (!res.ok) { errorEl.textContent = data.error || 'Failed to save.'; errorEl.style.display = 'block'; return }
    sessionTypes.push(data)
    renderSessionTypeDropdown(sport)
    document.getElementById('sessionTypeSelect').value = data.id
    nameInput.value = ''; errorEl.style.display = 'none'
  } catch (err) { errorEl.textContent = 'Network error.'; errorEl.style.display = 'block' }
}

function cancelCustomSessionType() {
  document.getElementById('customSessionTypeForm').style.display = 'none'
  document.getElementById('customSessionTypeName').value = ''
  document.getElementById('customTypeError').style.display = 'none'
  document.getElementById('sessionTypeSelect').value = ''
}

function getSelectedSessionType() {
  const select = document.getElementById('sessionTypeSelect')
  if (!select || !select.value || select.value === '__add_new__') return null
  const selected = sessionTypes.find(s => s.id == select.value)
  return selected ? { id: selected.id, name: selected.name } : null
}

// ── Sport Stats ───────────────────────────────────────────────────────────
function renderSportStats(sport) {
  const container = document.getElementById('sport-stats-container')
  const fields = SPORT_STATS[sport]
  if (!fields) { container.innerHTML = ''; return }
  const rows = []
  for (let i = 0; i < fields.length; i += 2) {
    const pair = fields.slice(i, i + 2)
    rows.push(`<div class="form-row">${pair.map(f => `<div class="form-group"><label>${f.label}</label><input type="number" id="stat-${f.key}" placeholder="0" min="0" step="any"/></div>`).join('')}</div>`)
  }
  container.innerHTML = `<div class="section-title" style="margin-bottom:0.75rem;">Match Stats</div>${rows.join('')}`
}

function collectSportStats() {
  const sport = document.getElementById('log-sport').value
  const fields = SPORT_STATS[sport]; if (!fields) return {}
  const stats = {}
  fields.forEach(f => { const val = document.getElementById(`stat-${f.key}`)?.value; if (val !== '' && val !== undefined) stats[f.key] = parseFloat(val) || 0 })
  return stats
}

// ── Exercise Autocomplete ─────────────────────────────────────────────────
let exSearchTimer = null

function showAddExercise() { document.getElementById('exercise-form').style.display = 'block' }
function hideAddExercise() {
  document.getElementById('exercise-form').style.display = 'none'
  ;['ex-name', 'ex-sets', 'ex-reps', 'ex-weight'].forEach(id => document.getElementById(id).value = '')
  hideExSuggestions()
}

function onExNameInput() {
  const val = document.getElementById('ex-name').value.trim()
  clearTimeout(exSearchTimer)
  if (val.length < 2) { hideExSuggestions(); return }
  exSearchTimer = setTimeout(() => fetchExerciseSuggestions(val), 300)
}

async function fetchExerciseSuggestions(q) {
  try {
    const res = await fetch(`${API}/workouts/exercises/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })
    renderExSuggestions(await res.json())
  } catch { hideExSuggestions() }
}

function renderExSuggestions(items) {
  const el = document.getElementById('ex-suggestions')
  if (!items.length) { hideExSuggestions(); return }
  el.innerHTML = items.map(e => {
    const safe = (e.name || e).replace(/'/g, "\\'")
    const meta = e.muscles ? `<span style="font-size:.7rem;color:var(--muted);margin-left:.5rem;">${e.muscles}</span>` : ''
    return `<div class="ex-suggestion-item" onmousedown="selectExSuggestion('${safe}')">${e.name || e}${meta}</div>`
  }).join('')
  el.style.display = 'block'
}

function selectExSuggestion(name) {
  document.getElementById('ex-name').value = name
  hideExSuggestions()
}

function hideExSuggestions() {
  const el = document.getElementById('ex-suggestions')
  if (el) el.style.display = 'none'
}

document.addEventListener('click', e => { if (!e.target.closest('.ex-autocomplete')) hideExSuggestions() })

// ── Exercise List ─────────────────────────────────────────────────────────
function addExercise() {
  const name = document.getElementById('ex-name').value.trim(); if (!name) return
  exercises.push({
    exercise_name: name,
    sets: parseInt(document.getElementById('ex-sets').value) || null,
    reps: parseInt(document.getElementById('ex-reps').value) || null,
    weight_kg: parseFloat(document.getElementById('ex-weight').value) || null
  })
  renderExerciseList(); hideAddExercise()
}

function removeExercise(idx) { exercises.splice(idx, 1); renderExerciseList() }

function renderExerciseList() {
  const list = document.getElementById('exercise-list')
  if (!exercises.length) { list.innerHTML = ''; return }
  list.innerHTML = exercises.map((ex, i) => `
    <div class="exercise-item">
      <div class="exercise-info">
        <div class="exercise-name">${ex.exercise_name}</div>
        <div class="exercise-meta">${[ex.sets ? `${ex.sets} sets` : '', ex.reps ? `${ex.reps} reps` : '', ex.weight_kg ? `${ex.weight_kg}kg` : ''].filter(Boolean).join(' · ') || 'No details'}</div>
      </div>
      <button class="btn-danger" onclick="removeExercise(${i})">Remove</button>
    </div>`).join('')
}

// ── Log Workout ───────────────────────────────────────────────────────────
async function handleLogWorkout() {
  clearAlert('alert-workout')
  const sport = document.getElementById('log-sport').value
  if (!sport) return showAlert('alert-workout', 'Please select a sport.')
  const sessionType = getSelectedSessionType()
  const payload = {
    sport,
    workout_date: document.getElementById('log-date').value || new Date().toISOString().split('T')[0],
    duration_minutes: parseInt(document.getElementById('log-duration').value) || null,
    distance_km: parseFloat(document.getElementById('log-distance').value) || null,
    notes: document.getElementById('log-notes').value.trim() || null,
    sport_stats: collectSportStats(),
    exercises,
    session_type_id: sessionType?.id || null,
    session_type_name: sessionType?.name || null
  }
  setLoading('btn-log-workout', true)
  try {
    const res = await fetch(`${API}/workouts`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to log workout')
    document.getElementById('log-sport').value = ''
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0]
    document.getElementById('log-duration').value = ''
    document.getElementById('log-distance').value = ''
    document.getElementById('log-notes').value = ''
    document.getElementById('sport-stats-container').innerHTML = ''
    document.getElementById('sessionTypeContainer').innerHTML = ''
    sessionTypes = []; exercises = []; renderExerciseList()
    showAlert('alert-workout', 'Workout saved!', 'success')
    setTimeout(() => switchWorkoutTab('history'), 1200)
  } catch (e) { showAlert('alert-workout', e.message) }
  finally { setLoading('btn-log-workout', false, 'Save Workout') }
}

// ── Workout History ───────────────────────────────────────────────────────
async function loadWorkoutHistory() {
  const container = document.getElementById('workout-history-list')
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div>'
  try {
    const res = await fetch(`${API}/workouts`, { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load workouts')
    renderWorkoutHistory(data.workouts)
  } catch (e) { container.innerHTML = `<div class="empty-state">${e.message}</div>` }
}

function renderWorkoutHistory(workouts) {
  const container = document.getElementById('workout-history-list')
  if (!workouts || !workouts.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div>No workouts logged yet.<br>Hit "Log Workout" to get started.</div>'
    return
  }
  container.innerHTML = workouts.map(w => {
    const date = new Date(w.workout_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const stats = w.sport_stats || {}
    const statBadges = Object.entries(stats).filter(([, v]) => v !== null && v !== 0).map(([k, v]) => `<div class="workout-stat-badge"><b>${v}</b> ${k.replace(/_/g, ' ')}</div>`).join('')
    const exerciseRows = (w.exercises || []).map(ex => `<div class="workout-exercise-row"><span>${ex.exercise_name}</span> — ${[ex.sets ? `${ex.sets} sets` : '', ex.reps ? `${ex.reps} reps` : '', ex.weight_kg ? `${ex.weight_kg}kg` : ''].filter(Boolean).join(', ') || '—'}</div>`).join('')
    const sessionBadge = w.session_type_name ? `<div class="workout-session-type">${w.session_type_name}</div>` : ''
    return `
      <div class="workout-card">
        <div class="workout-card-header">
          <div class="workout-sport">${w.sport}</div>
          <div class="workout-date">${date}</div>
        </div>
        ${sessionBadge}
        <div class="workout-meta">
          ${w.duration_minutes ? `<div class="workout-meta-item">⏱ <span>${w.duration_minutes} min</span></div>` : ''}
          ${w.distance_km ? `<div class="workout-meta-item">📍 <span>${w.distance_km} km</span></div>` : ''}
        </div>
        ${statBadges ? `<div class="workout-stats">${statBadges}</div>` : ''}
        ${exerciseRows ? `<div class="workout-exercises-list">${exerciseRows}</div>` : ''}
        ${w.notes ? `<div style="font-size:0.8rem;color:var(--muted);margin-top:0.5rem;font-style:italic;">"${w.notes}"</div>` : ''}
        <div class="workout-footer"><button class="btn-danger" onclick="deleteWorkout(${w.id})">Delete</button></div>
      </div>`
  }).join('')
}

async function deleteWorkout(id) {
  if (!confirm('Delete this workout?')) return
  try {
    const res = await fetch(`${API}/workouts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    if (!res.ok) throw new Error('Failed to delete')
    loadWorkoutHistory()
  } catch (e) { showAlert('alert-history', e.message) }
}

// ── Analytics ─────────────────────────────────────────────────────────────
let analyticsRange = '30d'
let chartVolume = null, chartStrength = null, chartTrends = null

const CHART_DEFAULTS = {
  color: '#c8ff00',
  gridColor: 'rgba(255,255,255,0.05)',
  textColor: '#666680',
  font: { family: 'DM Sans', size: 11 },
}

function chartBaseOptions(yLabel = '') {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: CHART_DEFAULTS.textColor, font: CHART_DEFAULTS.font }, grid: { color: CHART_DEFAULTS.gridColor } },
      y: { ticks: { color: CHART_DEFAULTS.textColor, font: CHART_DEFAULTS.font }, grid: { color: CHART_DEFAULTS.gridColor }, title: { display: !!yLabel, text: yLabel, color: CHART_DEFAULTS.textColor, font: CHART_DEFAULTS.font } },
    },
  }
}

function setAnalyticsRange(range) {
  analyticsRange = range
  document.querySelectorAll('.range-pill').forEach((p, i) => {
    p.classList.toggle('active', ['7d', '30d', '90d'][i] === range)
  })
  loadAnalytics()
}

async function loadAnalytics() {
  if (!token) return
  const r = analyticsRange
  try {
    const [volRes, trendsRes, strRes] = await Promise.all([
      fetch(`${API}/workouts/analytics/volume?range=${r}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/workouts/analytics/trends?range=${r}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/workouts/analytics/strength?range=${r}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
    const [volData, trendsData, strData] = await Promise.all([volRes.json(), trendsRes.json(), strRes.json()])
    renderVolumeChart(volData)
    renderTrendsChart(trendsData)
    populateExerciseDropdown(strData.exercises || [])
    const sel = document.getElementById('strength-exercise-select')
    if (sel.value) renderStrengthChart(strData.points || [])
  } catch (e) { console.error('Analytics error:', e) }
}

function renderVolumeChart(data) {
  const labels = data.map(d => d.week.slice(5))
  const sessions = data.map(d => d.sessions)
  const reps = data.map(d => d.total_reps)
  if (chartVolume) chartVolume.destroy()
  chartVolume = new Chart(document.getElementById('chart-volume'), {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Sessions', data: sessions, backgroundColor: 'rgba(200,255,0,0.5)', borderColor: '#c8ff00', borderWidth: 1, yAxisID: 'y' },
        { type: 'line', label: 'Total Reps', data: reps, borderColor: '#7c6fff', backgroundColor: 'rgba(124,111,255,0.1)', tension: 0.3, pointRadius: 3, yAxisID: 'y1' },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: CHART_DEFAULTS.textColor, font: CHART_DEFAULTS.font }, grid: { color: CHART_DEFAULTS.gridColor } },
        y: { ticks: { color: CHART_DEFAULTS.textColor, font: CHART_DEFAULTS.font }, grid: { color: CHART_DEFAULTS.gridColor }, position: 'left' },
        y1: { ticks: { color: '#7c6fff', font: CHART_DEFAULTS.font }, grid: { display: false }, position: 'right' },
      },
    },
  })
}

function populateExerciseDropdown(exercises) {
  const sel = document.getElementById('strength-exercise-select')
  const current = sel.value
  sel.innerHTML = '<option value="">Select exercise...</option>' +
    exercises.map(e => `<option value="${e}"${e === current ? ' selected' : ''}>${e}</option>`).join('')
}

async function loadStrengthChart() {
  const exercise = document.getElementById('strength-exercise-select').value
  if (!exercise) { if (chartStrength) { chartStrength.destroy(); chartStrength = null } return }
  try {
    const res = await fetch(`${API}/workouts/analytics/strength?range=${analyticsRange}&exercise=${encodeURIComponent(exercise)}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    renderStrengthChart(data.points || [])
  } catch (e) { console.error('Strength chart error:', e) }
}

function renderStrengthChart(points) {
  const labels = points.map(p => p.date.slice(5))
  const weights = points.map(p => p.max_weight)
  if (chartStrength) chartStrength.destroy()
  chartStrength = new Chart(document.getElementById('chart-strength'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Max kg', data: weights, borderColor: '#c8ff00', backgroundColor: 'rgba(200,255,0,0.1)', tension: 0.3, pointRadius: 4, pointBackgroundColor: '#c8ff00' }] },
    options: chartBaseOptions('kg'),
  })
}

function renderTrendsChart(data) {
  const labels = data.map(d => d.date.slice(5))
  const durations = data.map(d => d.duration_minutes)
  const volumes = data.map(d => d.volume)
  if (chartTrends) chartTrends.destroy()
  chartTrends = new Chart(document.getElementById('chart-trends'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Duration (min)', data: durations, borderColor: '#c8ff00', backgroundColor: 'rgba(200,255,0,0.1)', tension: 0.3, pointRadius: 3, yAxisID: 'y' },
        { label: 'Volume (sets×reps)', data: volumes, borderColor: '#ff7c7c', backgroundColor: 'rgba(255,124,124,0.1)', tension: 0.3, pointRadius: 3, yAxisID: 'y1' },
      ],
    },
    options: {
      ...chartBaseOptions(),
      scales: {
        x: { ticks: { color: CHART_DEFAULTS.textColor, font: CHART_DEFAULTS.font }, grid: { color: CHART_DEFAULTS.gridColor } },
        y: { ticks: { color: CHART_DEFAULTS.textColor, font: CHART_DEFAULTS.font }, grid: { color: CHART_DEFAULTS.gridColor }, position: 'left' },
        y1: { ticks: { color: '#ff7c7c', font: CHART_DEFAULTS.font }, grid: { display: false }, position: 'right' },
      },
      plugins: { legend: { display: true, labels: { color: CHART_DEFAULTS.textColor, font: CHART_DEFAULTS.font, boxWidth: 12 } } },
    },
  })
}
