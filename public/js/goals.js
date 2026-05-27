let goalsMeasurementTypes = []

async function initGoalsTab() {
  if (!goalsMeasurementTypes.length) await loadGoalsMeasurementTypes()
  populateGoalMeasurementSelect()
  await loadGoals()
}

async function loadGoalsMeasurementTypes() {
  try {
    const res = await fetch(`${API}/performance/measurement-types`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    goalsMeasurementTypes = await res.json()
  } catch (err) { console.error('Failed to load measurement types for goals', err) }
}

function populateGoalMeasurementSelect() {
  const sel = document.getElementById('goal-measurement-select')
  if (!sel) return
  sel.innerHTML = '<option value="">— None —</option>'
  const grouped = {}
  goalsMeasurementTypes.forEach(m => {
    if (!grouped[m.category]) grouped[m.category] = []
    grouped[m.category].push(m)
  })
  Object.entries(grouped).forEach(([cat, items]) => {
    const group = document.createElement('optgroup')
    group.label = cat.charAt(0).toUpperCase() + cat.slice(1)
    items.forEach(m => {
      const opt = document.createElement('option')
      opt.value = m.id
      opt.dataset.unit = m.unit || ''
      opt.textContent = `${m.name}${m.unit ? ' (' + m.unit + ')' : ''}`
      group.appendChild(opt)
    })
    sel.appendChild(group)
  })
}

async function loadGoals() {
  try {
    const res = await fetch(`${API}/goals`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const goals = await res.json()
    renderGoalsList(goals)
  } catch (err) { console.error('Failed to load goals', err) }
}

function renderGoalsList(goals) {
  const list = document.getElementById('goals-list')
  if (!goals.length) {
    list.innerHTML = '<p class="empty-msg" style="padding:2rem 0">No goals yet. Hit "+ New Goal" to get started!</p>'
    return
  }

  const active = goals.filter(g => !g.completed_at)
  const done   = goals.filter(g =>  g.completed_at)

  let html = ''
  if (active.length) {
    html += active.map(g => renderGoalCard(g)).join('')
  }
  if (done.length) {
    html += `<div class="goals-section-label">Completed</div>`
    html += done.map(g => renderGoalCard(g)).join('')
  }
  list.innerHTML = html
}

function renderGoalCard(g) {
  let progressHtml = ''
  if (g.measurement_type_id && g.target_value != null && g.current_value != null) {
    const cur = parseFloat(g.current_value)
    const tgt = parseFloat(g.target_value)
    const pct = g.lower_is_better
      ? Math.min(100, Math.max(0, Math.round(((tgt - cur) / tgt) * 100 + 100)))
      : Math.min(100, Math.max(0, Math.round((cur / tgt) * 100)))
    progressHtml = `
      <div class="goal-progress-section">
        <div class="goal-progress-track">
          <div class="goal-progress-bar${g.completed_at ? ' done' : ''}" style="width:${pct}%"></div>
        </div>
        <div class="goal-progress-meta">
          <span class="goal-cur-val">${cur} ${g.measurement_unit || ''}</span>
          <span class="goal-pct-badge">${pct}%</span>
          <span class="goal-tgt-val">→ ${tgt} ${g.measurement_unit || ''}</span>
        </div>
      </div>`
  } else if (g.target_value != null) {
    progressHtml = `<div class="goal-target-simple">Target: <strong>${g.target_value} ${g.measurement_unit || ''}</strong></div>`
  }

  const dateStr = g.target_date
    ? new Date(g.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const daysLeft = g.target_date && !g.completed_at
    ? Math.ceil((new Date(g.target_date + 'T00:00:00') - new Date()) / 86400000)
    : null

  const urgencyClass = daysLeft != null && daysLeft <= 7 && daysLeft >= 0 ? ' urgent' : ''
  const completedClass = g.completed_at ? ' completed' : ''

  return `
    <div class="goal-card${completedClass}">
      <div class="goal-card-header">
        <div class="goal-title">${g.completed_at ? '✓ ' : ''}${g.title}</div>
        <div class="goal-card-actions">
          <button class="goal-action-btn" onclick="toggleGoalComplete(${g.id})" title="${g.completed_at ? 'Reopen' : 'Mark complete'}">
            ${g.completed_at ? '↩' : '✓'}
          </button>
          <button class="goal-action-btn danger" onclick="deleteGoal(${g.id})" title="Delete">✕</button>
        </div>
      </div>
      ${g.measurement_name ? `<div class="goal-measurement-link">${g.measurement_name}</div>` : ''}
      ${progressHtml}
      <div class="goal-footer">
        ${dateStr ? `<span class="goal-date${urgencyClass}">📅 ${dateStr}${daysLeft != null ? (daysLeft < 0 ? ' (overdue)' : daysLeft === 0 ? ' (today!)' : ` (${daysLeft}d left)`) : ''}</span>` : ''}
        ${g.notes ? `<span class="goal-notes-snippet">${g.notes.slice(0, 60)}${g.notes.length > 60 ? '…' : ''}</span>` : ''}
      </div>
    </div>`
}

function openGoalModal() {
  if (!goalsMeasurementTypes.length) loadGoalsMeasurementTypes().then(populateGoalMeasurementSelect)
  document.getElementById('goal-title').value = ''
  document.getElementById('goal-measurement-select').value = ''
  document.getElementById('goal-target-value').value = ''
  document.getElementById('goal-target-date').value = ''
  document.getElementById('goal-notes').value = ''
  document.getElementById('goal-target-unit').textContent = ''
  document.getElementById('goal-create-modal').style.display = 'flex'
  document.getElementById('goal-measurement-select').onchange = function() {
    const opt = this.options[this.selectedIndex]
    document.getElementById('goal-target-unit').textContent = opt?.dataset?.unit ? `(${opt.dataset.unit})` : ''
  }
}

function closeGoalModal() {
  document.getElementById('goal-create-modal').style.display = 'none'
}

async function saveGoal() {
  const title = document.getElementById('goal-title').value.trim()
  if (!title) { alert('Please enter a goal title.'); return }
  const sel = document.getElementById('goal-measurement-select')
  const measurement_type_id = sel.value || null
  const target_value = document.getElementById('goal-target-value').value || null
  const target_date  = document.getElementById('goal-target-date').value || null
  const notes        = document.getElementById('goal-notes').value.trim() || null

  try {
    const res = await fetch(`${API}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, measurement_type_id, target_value, target_date, notes })
    })
    if (!res.ok) throw new Error('Failed to save goal')
    closeGoalModal()
    await loadGoals()
  } catch (err) { alert('Error: ' + err.message) }
}

async function toggleGoalComplete(id) {
  try {
    await fetch(`${API}/goals/${id}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })
    await loadGoals()
  } catch (err) { console.error('Failed to toggle goal', err) }
}

async function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return
  try {
    await fetch(`${API}/goals/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    await loadGoals()
  } catch (err) { console.error('Failed to delete goal', err) }
}
