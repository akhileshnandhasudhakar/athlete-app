let currentProgramPreview = null

async function initProgramsTab() {
  await Promise.all([loadPresetPrograms(), loadMyPrograms()])
}

async function loadPresetPrograms() {
  try {
    const res = await fetch(`${API}/programs/presets`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const presets = await res.json()
    renderPresetPrograms(presets)
  } catch (err) {
    document.getElementById('preset-programs-list').innerHTML =
      '<p class="empty-msg">Failed to load presets.</p>'
  }
}

function renderPresetPrograms(presets) {
  const el = document.getElementById('preset-programs-list')
  el.innerHTML = presets.map(p => `
    <div class="program-card preset">
      <div class="program-card-header">
        <div class="program-title">${p.title}</div>
        <span class="program-preset-badge">Template</span>
      </div>
      <div class="program-meta">
        ${p.sport ? `<span class="program-tag">${p.sport}</span>` : ''}
        ${p.days_per_week ? `<span class="program-tag">${p.days_per_week}×/week</span>` : ''}
      </div>
      <div class="program-desc">${p.description || ''}</div>
      <div class="program-card-actions">
        <button class="btn btn-outline btn-sm" onclick="previewProgram(${JSON.stringify(p).replace(/"/g, '&quot;')})">View</button>
        <button class="btn btn-primary btn-sm" style="font-family:var(--font-body);letter-spacing:0;font-size:0.82rem;" onclick="savePresetToMine(${JSON.stringify(p).replace(/"/g, '&quot;')})">Save to My Programs</button>
      </div>
    </div>`).join('')
}

async function loadMyPrograms() {
  try {
    const res = await fetch(`${API}/programs`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const programs = await res.json()
    renderMyPrograms(programs)
  } catch (err) {
    document.getElementById('my-programs-list').innerHTML =
      '<p class="empty-msg">Failed to load programs.</p>'
  }
}

function renderMyPrograms(programs) {
  const el = document.getElementById('my-programs-list')
  if (!programs.length) {
    el.innerHTML = '<p class="empty-msg">No saved programs yet.</p>'
    return
  }
  el.innerHTML = programs.map(p => `
    <div class="program-card">
      <div class="program-card-header">
        <div class="program-title">${p.title}</div>
      </div>
      <div class="program-meta">
        ${p.sport ? `<span class="program-tag">${p.sport}</span>` : ''}
        ${p.days_per_week ? `<span class="program-tag">${p.days_per_week}×/week</span>` : ''}
        <span class="program-tag">${(p.days || []).length} days</span>
      </div>
      ${p.description ? `<div class="program-desc">${p.description}</div>` : ''}
      <div class="program-card-actions">
        <button class="btn btn-outline btn-sm" onclick="previewProgram(${JSON.stringify(p).replace(/"/g, '&quot;')})">View</button>
        <button class="btn-danger" onclick="deleteMyProgram(${p.id})">Delete</button>
      </div>
    </div>`).join('')
}

function previewProgram(program) {
  currentProgramPreview = program
  document.getElementById('prog-modal-title').textContent = program.title
  const meta = [program.sport, program.days_per_week ? `${program.days_per_week} days/week` : null]
    .filter(Boolean).join(' · ')
  document.getElementById('prog-modal-meta').textContent = meta
  document.getElementById('prog-modal-desc').textContent = program.description || ''

  const daysEl = document.getElementById('prog-modal-days')
  const days = program.days || []
  daysEl.innerHTML = days.map(d => {
    const exercises = (typeof d.exercises === 'string' ? JSON.parse(d.exercises) : d.exercises) || []
    return `
      <div class="prog-day">
        <div class="prog-day-header">Day ${d.day_number}${d.label ? ' — ' + d.label : ''}</div>
        <div class="prog-day-exercises">
          ${exercises.map(ex => `
            <div class="prog-exercise-row">
              <span class="prog-ex-name">${ex.name}</span>
              <span class="prog-ex-detail">${[ex.sets ? `${ex.sets}×${ex.reps || '?'}` : '', ex.note || ''].filter(Boolean).join(' · ')}</span>
            </div>`).join('')}
        </div>
      </div>`
  }).join('')

  // Show save button only for presets (no id or string id)
  const saveBtn = document.getElementById('prog-modal-save-btn')
  const isPreset = !program.id || typeof program.id === 'string'
  saveBtn.style.display = isPreset ? 'inline-flex' : 'none'
  saveBtn.onclick = () => savePresetToMine(program)

  document.getElementById('program-detail-modal').style.display = 'flex'
}

function closeProgramModal() {
  document.getElementById('program-detail-modal').style.display = 'none'
  currentProgramPreview = null
}

async function savePresetToMine(preset) {
  try {
    const res = await fetch(`${API}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: preset.title,
        sport: preset.sport,
        days_per_week: preset.days_per_week,
        description: preset.description,
        days: preset.days
      })
    })
    if (!res.ok) throw new Error('Failed to save program')
    closeProgramModal()
    showAlert('alert-programs', 'Program saved!', 'success')
    await loadMyPrograms()
  } catch (err) { alert('Error: ' + err.message) }
}

async function deleteMyProgram(id) {
  if (!confirm('Delete this program?')) return
  try {
    await fetch(`${API}/programs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    await loadMyPrograms()
  } catch (err) { console.error('Failed to delete program', err) }
}

function openCreateProgramModal() {
  document.getElementById('cp-title').value = ''
  document.getElementById('cp-sport').value = ''
  document.getElementById('cp-days-per-week').value = ''
  document.getElementById('cp-description').value = ''
  document.getElementById('create-program-modal').style.display = 'flex'
}

function closeCreateProgramModal() {
  document.getElementById('create-program-modal').style.display = 'none'
}

async function saveCustomProgram() {
  const title = document.getElementById('cp-title').value.trim()
  if (!title) { alert('Please enter a program title.'); return }
  try {
    const res = await fetch(`${API}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title,
        sport: document.getElementById('cp-sport').value || null,
        days_per_week: parseInt(document.getElementById('cp-days-per-week').value) || null,
        description: document.getElementById('cp-description').value.trim() || null,
        days: []
      })
    })
    if (!res.ok) throw new Error('Failed to save program')
    closeCreateProgramModal()
    showAlert('alert-programs', 'Program created!', 'success')
    await loadMyPrograms()
  } catch (err) { alert('Error: ' + err.message) }
}
