const SPORT_COLORS = {
  Basketball: '#ff9800', Soccer: '#4caf50', Football: '#795548',
  Baseball:   '#2196f3', Cricket:  '#9c27b0', 'Track & Field': '#f44336',
  Swimming:   '#00bcd4', Cycling:  '#009688', Weightlifting: '#607d8b',
  CrossFit:   '#ff5722', MMA:      '#e91e63', Other: '#666680'
}

let calYear  = new Date().getFullYear()
let calMonth = new Date().getMonth() + 1
let calData  = { workouts: [], planned: [] }

async function initCalendarPanel() {
  await loadCalendarData()
}

async function loadCalendarData() {
  try {
    const res = await fetch(`${API}/calendar?year=${calYear}&month=${calMonth}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    calData = await res.json()
  } catch (err) {
    calData = { workouts: [], planned: [] }
  }
  renderCalendar()
}

function changeCalMonth(delta) {
  calMonth += delta
  if (calMonth > 12) { calMonth = 1;  calYear++ }
  if (calMonth < 1)  { calMonth = 12; calYear-- }
  document.getElementById('cal-day-detail').style.display = 'none'
  loadCalendarData()
}

function renderCalendar() {
  const label = document.getElementById('cal-month-label')
  const grid  = document.getElementById('cal-grid')
  const monthName = new Date(calYear, calMonth - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  label.textContent = monthName

  // Index data by date string
  const wByDate = {}
  calData.workouts.forEach(w => {
    if (!wByDate[w.date]) wByDate[w.date] = []
    wByDate[w.date].push(w)
  })
  const pByDate = {}
  calData.planned.forEach(p => {
    if (!pByDate[p.date]) pByDate[p.date] = []
    pByDate[p.date].push(p)
  })

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(calYear, calMonth, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)
  const pad = n => String(n).padStart(2, '0')

  let html = ''
  // Day headers
  ;['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => {
    html += `<div class="cal-cell cal-day-header">${d}</div>`
  })
  // Empty leading cells
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell cal-empty"></div>'

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calYear}-${pad(calMonth)}-${pad(day)}`
    const workouts  = wByDate[dateStr] || []
    const planned   = pByDate[dateStr] || []
    const isPast    = dateStr <= today
    const isToday   = dateStr === today
    const hasBoth   = workouts.length && planned.length

    let cellClass = 'cal-cell cal-day'
    if (isToday)          cellClass += ' cal-today'
    if (workouts.length)  cellClass += ' cal-has-workout'
    if (planned.length && !workouts.length) cellClass += ' cal-has-planned'

    const dots = [
      ...workouts.map(w => `<span class="cal-dot" style="background:${SPORT_COLORS[w.sport] || 'var(--accent)'}"></span>`),
      ...planned.map(() => `<span class="cal-dot planned"></span>`)
    ].slice(0, 4).join('')

    html += `
      <div class="${cellClass}" onclick="onCalDayClick('${dateStr}', ${isPast})">
        <span class="cal-day-num">${day}</span>
        <div class="cal-dots">${dots}</div>
      </div>`
  }

  grid.innerHTML = html
}

function onCalDayClick(dateStr, isPast) {
  const detail = document.getElementById('cal-day-detail')
  const workouts = calData.workouts.filter(w => w.date === dateStr)
  const planned  = calData.planned.filter(p => p.date === dateStr)
  const isFuture = dateStr > new Date().toISOString().slice(0, 10)

  const dateDisplay = new Date(dateStr + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  let html = `<div class="cal-detail-date">${dateDisplay}</div>`

  if (workouts.length) {
    html += workouts.map(w => `
      <div class="cal-detail-workout">
        <span class="cal-detail-sport" style="color:${SPORT_COLORS[w.sport] || 'var(--accent)'}">${w.sport}</span>
        ${w.duration_minutes ? `<span class="cal-detail-meta">⏱ ${w.duration_minutes} min</span>` : ''}
        ${w.exercise_count ? `<span class="cal-detail-meta">${w.exercise_count} exercises</span>` : ''}
      </div>`).join('')
  }

  if (planned.length) {
    html += planned.map(p => `
      <div class="cal-detail-planned">
        <span class="cal-planned-badge">Planned</span>
        <span class="cal-detail-sport">${p.sport || 'Training'}</span>
        ${p.notes ? `<span class="cal-detail-meta">${p.notes}</span>` : ''}
        <button class="cal-delete-btn" onclick="deletePlanned(${p.id}, '${dateStr}')">✕</button>
      </div>`).join('')
  }

  if (!workouts.length && !planned.length) {
    html += `<p class="empty-msg" style="padding:.5rem 0;font-size:.82rem">No sessions logged.</p>`
  }

  if (isFuture || (!workouts.length && !isFuture)) {
    html += `<button class="cal-plan-btn" onclick="openPlanModal('${dateStr}')">+ Plan Session</button>`
  }

  detail.innerHTML = html
  detail.style.display = 'block'
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function openPlanModal(dateStr) {
  document.getElementById('plan-date').value = dateStr
  document.getElementById('plan-sport').value = ''
  document.getElementById('plan-notes').value = ''
  document.getElementById('plan-modal-title').textContent =
    'Plan — ' + new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  document.getElementById('plan-session-modal').style.display = 'flex'
}

function closePlanModal() {
  document.getElementById('plan-session-modal').style.display = 'none'
}

async function savePlannedSession() {
  const date  = document.getElementById('plan-date').value
  const sport = document.getElementById('plan-sport').value
  const notes = document.getElementById('plan-notes').value.trim()
  try {
    const res = await fetch(`${API}/calendar/planned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date, sport, notes })
    })
    if (!res.ok) throw new Error('Failed to save')
    closePlanModal()
    await loadCalendarData()
    onCalDayClick(date, false)
  } catch (err) { alert('Error: ' + err.message) }
}

async function deletePlanned(id, dateStr) {
  try {
    await fetch(`${API}/calendar/planned/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    await loadCalendarData()
    onCalDayClick(dateStr, false)
  } catch (err) { console.error('Failed to delete planned session', err) }
}
