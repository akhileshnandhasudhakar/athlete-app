// ── AI Workout Generator ───────────────────────────────────────────────────
async function generateAIProgram() {
  const goal = document.getElementById('ai-goal-input').value.trim()
  if (!goal) { alert('Please describe your goal first.'); return }

  const sport      = document.getElementById('ai-sport-select').value
  const days_per_week = document.getElementById('ai-days-select').value
  const btn    = document.getElementById('ai-generate-btn')
  const result = document.getElementById('ai-generate-result')

  btn.disabled = true
  btn.textContent = 'Generating...'
  result.innerHTML = '<div class="ai-loading"><div class="spinner" style="border-top-color:var(--accent)"></div> Designing your program…</div>'

  try {
    const res = await fetch(`${API}/ai/generate-program`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ goal, sport, days_per_week: parseInt(days_per_week) })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    renderAIProgram(data.program, result)
  } catch (err) {
    result.innerHTML = `<p class="ai-error">${err.message}</p>`
  } finally {
    btn.disabled = false
    btn.textContent = 'Generate Program'
  }
}

function renderAIProgram(program, container) {
  const daysHtml = (program.days || []).map(d => {
    const exercises = (d.exercises || []).map(ex => `
      <div class="prog-exercise-row">
        <span class="prog-ex-name">${ex.name}</span>
        <span class="prog-ex-detail">${[ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : '', ex.note || ''].filter(Boolean).join(' · ')}</span>
      </div>`).join('')
    return `
      <div class="prog-day">
        <div class="prog-day-header">Day ${d.day_number}${d.label ? ' — ' + d.label : ''}</div>
        <div class="prog-day-exercises">${exercises}</div>
      </div>`
  }).join('')

  container.innerHTML = `
    <div class="ai-program-result">
      <div class="ai-program-header">
        <div class="ai-program-title">${program.title}</div>
        <div class="ai-program-meta">
          ${program.sport ? `<span class="program-tag">${program.sport}</span>` : ''}
          ${program.days_per_week ? `<span class="program-tag">${program.days_per_week}×/week</span>` : ''}
        </div>
      </div>
      <p class="ai-program-desc">${program.description || ''}</p>
      <div class="ai-program-days">${daysHtml}</div>
      <button class="btn btn-primary" style="margin-top:.75rem" onclick="saveAIProgram(${JSON.stringify(program).replace(/"/g, '&quot;')})">Save to My Programs</button>
    </div>`
}

async function saveAIProgram(program) {
  try {
    const res = await fetch(`${API}/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(program)
    })
    if (!res.ok) throw new Error('Failed to save')
    alert('Program saved to My Programs!')
  } catch (err) { alert('Error: ' + err.message) }
}

// ── AI Weekly Summary (called from Dashboard) ──────────────────────────────
async function loadAISummary() {
  const btn     = document.getElementById('ai-summary-btn')
  const content = document.getElementById('ai-summary-content')

  btn.textContent = 'Loading...'
  btn.style.pointerEvents = 'none'
  content.innerHTML = '<div class="ai-loading"><div class="spinner" style="border-top-color:var(--accent)"></div> Analyzing your week…</div>'

  try {
    const res = await fetch(`${API}/ai/weekly-summary`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    const paragraphs = data.summary.split(/\n\n+/).filter(Boolean)
    content.innerHTML = paragraphs.map(p => `<p class="ai-summary-para">${p}</p>`).join('')
    btn.textContent = 'Refresh'
  } catch (err) {
    content.innerHTML = `<p class="ai-error">${err.message}</p>`
    btn.textContent = 'Get Summary'
  } finally {
    btn.style.pointerEvents = ''
  }
}

// ── Exercise Form Tips ─────────────────────────────────────────────────────
async function fetchExerciseTips() {
  const input  = document.getElementById('ai-tips-input')
  const result = document.getElementById('ai-tips-result')
  const exercise = input.value.trim()
  if (!exercise) { alert('Enter an exercise name.'); return }

  result.innerHTML = '<div class="ai-loading"><div class="spinner" style="border-top-color:var(--accent)"></div> Fetching tips…</div>'

  try {
    const res = await fetch(`${API}/ai/exercise-tips?exercise=${encodeURIComponent(exercise)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    result.innerHTML = `
      <div class="ai-tips-list">
        ${(data.tips || []).map((tip, i) => `
          <div class="ai-tip-item">
            <span class="ai-tip-num">${i + 1}</span>
            <span>${tip}</span>
          </div>`).join('')}
      </div>`
  } catch (err) {
    result.innerHTML = `<p class="ai-error">${err.message}</p>`
  }
}
