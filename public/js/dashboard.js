async function loadDashboard() {
  try {
    const res = await fetch(`${API}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return
    const d = await res.json()
    renderDashboard(d)
    loadAchievements()
  } catch (err) {
    console.error('Dashboard load error:', err)
  }
}

function renderDashboard(d) {
  // Week stats
  document.getElementById('dash-workouts').textContent = d.workouts_this_week ?? '0'
  document.getElementById('dash-streak').textContent = d.streak ?? '0'

  // Nutrition
  const nutr = d.today_nutrition || {}
  const goals = d.nutrition_goals || {}
  document.getElementById('dash-cal').textContent = nutr.calories ?? '0'
  const calGoal = goals.daily_calories
  document.getElementById('dash-cal-goal').textContent = calGoal ? `/ ${calGoal} kcal` : ''

  const macros = [
    { key: 'protein', label: 'Protein', goal: goals.protein_g, color: '#2196f3' },
    { key: 'carbs',   label: 'Carbs',   goal: goals.carbs_g,   color: '#ff9800' },
    { key: 'fats',    label: 'Fats',    goal: goals.fats_g,    color: '#e91e63' },
  ]
  document.getElementById('dash-macro-rows').innerHTML = macros.map(m => {
    const val = parseFloat(nutr[m.key] || 0).toFixed(0)
    const pct = m.goal ? Math.min(100, Math.round((val / m.goal) * 100)) : 0
    const goalText = m.goal ? `/ ${m.goal}g` : ''
    return `
      <div class="dash-macro-row">
        <span class="dash-macro-name">${m.label}</span>
        <div class="dash-macro-bar-track">
          <div class="dash-macro-bar" style="width:${pct}%;background:${m.color}"></div>
        </div>
        <span class="dash-macro-num">${val}g ${goalText}</span>
      </div>`
  }).join('')

  // Wearable health
  const w = d.today_wearable
  document.getElementById('dash-steps').textContent = w?.steps ? Number(w.steps).toLocaleString() : '—'
  document.getElementById('dash-sleep').textContent = w?.sleep_hours ? parseFloat(w.sleep_hours).toFixed(1) : '—'
  document.getElementById('dash-hr').textContent    = w?.heart_rate_avg ? `${w.heart_rate_avg} bpm` : '—'

  // Active goals
  const goalsList = document.getElementById('dash-goals-list')
  if (d.active_goals && d.active_goals.length) {
    goalsList.innerHTML = d.active_goals.map(g => renderDashGoalRow(g)).join('')
  } else {
    goalsList.innerHTML = `<p class="empty-msg" style="padding:1rem 0">No active goals. <button class="dash-inline-btn" onclick="switchPanel('goals')">Add one</button></p>`
  }

  // Recent PRs
  const prList = document.getElementById('dash-prs-list')
  if (d.recent_prs && d.recent_prs.length) {
    prList.innerHTML = d.recent_prs.map(pr => `
      <div class="dash-pr-row">
        <div class="dash-pr-left">
          <span class="dash-pr-badge">PR</span>
          <div>
            <div class="dash-pr-name">${pr.measurement_name}</div>
            <div class="dash-pr-date">${new Date(pr.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>
        <div class="dash-pr-val">${pr.value}<span class="dash-pr-unit"> ${pr.default_unit || ''}</span></div>
      </div>`).join('')
  } else {
    prList.innerHTML = `<p class="empty-msg" style="padding:1rem 0">No PRs in the last 90 days.</p>`
  }
}

function renderDashGoalRow(g) {
  let progressHtml = ''
  if (g.measurement_type_id && g.target_value && g.current_value != null) {
    const cur = parseFloat(g.current_value)
    const tgt = parseFloat(g.target_value)
    const pct = g.lower_is_better
      ? Math.min(100, Math.max(0, Math.round(((tgt - cur) / tgt) * 100 + 100)))
      : Math.min(100, Math.max(0, Math.round((cur / tgt) * 100)))
    progressHtml = `
      <div class="dash-goal-progress-row">
        <div class="dash-goal-bar-track">
          <div class="dash-goal-bar" style="width:${pct}%"></div>
        </div>
        <span class="dash-goal-pct">${pct}%</span>
      </div>
      <div class="dash-goal-vals">${cur} ${g.measurement_unit || ''} → ${tgt} ${g.measurement_unit || ''}</div>`
  }
  const dateStr = g.target_date
    ? new Date(g.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  return `
    <div class="dash-goal-row">
      <div class="dash-goal-title">${g.title}</div>
      ${dateStr ? `<div class="dash-goal-date">Target: ${dateStr}</div>` : ''}
      ${progressHtml}
    </div>`
}
