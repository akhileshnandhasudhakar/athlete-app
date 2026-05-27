let allMeasurementTypes = [];
let progressRange = 30;
let progressChart = null;

async function initPerformanceTab() {
  await loadMeasurementTypes();
  await Promise.all([loadPRCards(), loadRecentLogs(), loadPRTimeline(), loadBodyMetricTypes()]);
  populateMeasurementDropdowns();
  document.getElementById('perf-date-input').value = new Date().toISOString().split('T')[0];
}

async function loadMeasurementTypes() {
  try {
    const res = await fetch(`${API}/performance/measurement-types`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    allMeasurementTypes = await res.json();
  } catch (err) { console.error('Failed to load measurement types', err) }
}

function populateMeasurementDropdowns() {
  const select = document.getElementById('progress-measurement-select');
  select.innerHTML = '<option value="">Select a measurement...</option>';

  const grouped = {};
  allMeasurementTypes.forEach(m => {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  Object.entries(grouped).forEach(([cat, items]) => {
    const group = document.createElement('optgroup');
    group.label = cat.charAt(0).toUpperCase() + cat.slice(1);
    items.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      group.appendChild(opt);
    });
    select.appendChild(group);
  });
}

async function loadPRCards() {
  try {
    const res = await fetch(`${API}/performance/records`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const records = await res.json();
    const grid = document.getElementById('pr-grid');

    if (!records.length) {
      grid.innerHTML = '<p class="empty-msg">No records yet. Log your first test!</p>';
      return;
    }

    grid.innerHTML = records.map(r => `
      <div class="pr-card">
        <span class="pr-badge">PR</span>
        <div class="pr-value">${r.value}<span class="pr-unit"> ${r.unit || r.default_unit || ''}</span></div>
        <div class="pr-name">${r.measurement_name}</div>
        <div class="pr-date">${new Date(r.logged_at).toLocaleDateString()}</div>
      </div>
    `).join('');
  } catch (err) { console.error('Failed to load PR cards', err) }
}

async function loadRecentLogs() {
  try {
    const res = await fetch(`${API}/performance/logs?range=30`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logs = await res.json();
    const list = document.getElementById('performance-log-list');

    if (!logs.length) {
      list.innerHTML = '<p class="empty-msg">No logs yet.</p>';
      return;
    }

    list.innerHTML = logs.slice(0, 20).map(l => `
      <div class="log-entry">
        <div class="log-entry-left">
          <div class="log-name">${l.measurement_name}</div>
          <div class="log-meta">${l.category} · ${new Date(l.logged_at).toLocaleDateString()}${l.notes ? ' · ' + l.notes : ''}</div>
        </div>
        <div class="log-entry-right">
          <div class="log-value">${l.value} <span style="font-size:.75rem;color:var(--muted)">${l.unit || l.default_unit || ''}</span></div>
          <button class="log-delete" onclick="deletePerformanceLog(${l.id})">🗑</button>
        </div>
      </div>
    `).join('');
  } catch (err) { console.error('Failed to load recent logs', err) }
}

async function loadProgressChart() {
  const measurementId = document.getElementById('progress-measurement-select').value;
  if (!measurementId) return;

  try {
    const res = await fetch(`${API}/performance/progress/${measurementId}?range=${progressRange}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    const labels = data.map(d => new Date(d.logged_at).toLocaleDateString());
    const values = data.map(d => parseFloat(d.value));
    const measurementName = data[0]?.measurement_name || 'Progress';
    const unit = data[0]?.unit || data[0]?.default_unit || '';

    if (progressChart) progressChart.destroy();

    progressChart = new Chart(document.getElementById('perf-progress-chart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${measurementName} (${unit})`,
          data: values,
          borderColor: '#c8ff00',
          backgroundColor: 'rgba(200,255,0,0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#c8ff00',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} ${unit}` } }
        },
        scales: {
          x: { ticks: { color: '#666680', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#666680', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: false }
        }
      }
    });
  } catch (err) { console.error('Failed to load progress chart', err) }
}

function setProgressRange(days, btn) {
  progressRange = days;
  document.querySelectorAll('.perf-range-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  loadProgressChart();
}

function openLogModal() {
  filterMeasurementsByCategory();
  document.getElementById('log-perf-modal').style.display = 'flex';
}

function closeLogModal() {
  document.getElementById('log-perf-modal').style.display = 'none';
  document.getElementById('perf-value-input').value = '';
  document.getElementById('perf-notes-input').value = '';
  document.getElementById('perf-unit-label').textContent = '—';
}

function filterMeasurementsByCategory() {
  const category = document.getElementById('perf-category-select').value;
  const select = document.getElementById('perf-measurement-select');

  const filtered = category
    ? allMeasurementTypes.filter(m => m.category === category)
    : allMeasurementTypes;

  select.innerHTML = '<option value="">Select measurement...</option>';
  filtered.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.dataset.unit = m.unit || '';
    opt.textContent = m.name;
    select.appendChild(opt);
  });
}

function onMeasurementSelected() {
  const select = document.getElementById('perf-measurement-select');
  const selected = select.options[select.selectedIndex];
  document.getElementById('perf-unit-label').textContent = selected?.dataset?.unit || '—';
}

async function submitPerformanceLog() {
  const measurement_type_id = document.getElementById('perf-measurement-select').value;
  const value = document.getElementById('perf-value-input').value;
  const notes = document.getElementById('perf-notes-input').value;
  const logged_at = document.getElementById('perf-date-input').value;
  const unit = document.getElementById('perf-unit-label').textContent;

  if (!measurement_type_id || !value) {
    alert('Please select a measurement and enter a value.');
    return;
  }

  try {
    const res = await fetch(`${API}/performance/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ measurement_type_id, value, unit, notes, logged_at })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save');

    if (data.is_pr) {
      const name = document.getElementById('perf-measurement-select').options[
        document.getElementById('perf-measurement-select').selectedIndex
      ].textContent;
      alert(`New Personal Record for ${name}!`);
    }

    closeLogModal();
    await Promise.all([loadPRCards(), loadRecentLogs()]);
  } catch (err) { alert('Error: ' + err.message) }
}

// ── PR Timeline ────────────────────────────────────────────────────────────
async function loadPRTimeline() {
  try {
    const res = await fetch(`${API}/performance/pr-history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const prs = await res.json();
    const list = document.getElementById('pr-timeline-list');
    if (!prs.length) {
      list.innerHTML = '<p class="empty-msg">No PRs recorded yet.</p>';
      return;
    }
    list.innerHTML = prs.map(pr => `
      <div class="log-entry">
        <div class="log-entry-left">
          <div class="log-name">${pr.measurement_name} <span class="pr-badge-inline">PR</span></div>
          <div class="log-meta">${pr.category} · ${new Date(pr.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div class="log-entry-right">
          <div class="log-value">${pr.value}<span style="font-size:.75rem;color:var(--muted)"> ${pr.default_unit || ''}</span></div>
        </div>
      </div>`).join('');
  } catch (err) { console.error('Failed to load PR timeline', err); }
}

// ── Body Metrics Chart ─────────────────────────────────────────────────────
let bodyMetricChart = null;
let bodyMetricRange = 90;

async function loadBodyMetricTypes() {
  try {
    const res = await fetch(`${API}/performance/body-metrics`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const types = await res.json();
    const sel = document.getElementById('body-metric-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Select metric...</option>' +
      types.map(t => `<option value="${t.id}" data-unit="${t.unit || ''}">${t.name}${t.unit ? ' (' + t.unit + ')' : ''}</option>`).join('');
  } catch (err) { console.error('Failed to load body metric types', err); }
}

async function loadBodyMetricChart() {
  const sel = document.getElementById('body-metric-select');
  const id = sel?.value;
  if (!id) { if (bodyMetricChart) { bodyMetricChart.destroy(); bodyMetricChart = null; } return; }
  const unit = sel.options[sel.selectedIndex]?.dataset?.unit || '';
  const rangeParam = bodyMetricRange >= 9999 ? '' : `?range=${bodyMetricRange}`;
  try {
    const res = await fetch(`${API}/performance/progress/${id}${rangeParam}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const labels = data.map(d => new Date(d.logged_at).toLocaleDateString());
    const values = data.map(d => parseFloat(d.value));
    if (bodyMetricChart) bodyMetricChart.destroy();
    bodyMetricChart = new Chart(document.getElementById('body-metrics-chart'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#7c6fff',
          backgroundColor: 'rgba(124,111,255,0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#7c6fff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} ${unit}` } }
        },
        scales: {
          x: { ticks: { color: '#666680', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#666680', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: false }
        }
      }
    });
  } catch (err) { console.error('Failed to load body metric chart', err); }
}

function setBodyRange(days, btn) {
  bodyMetricRange = days;
  document.querySelectorAll('.body-range-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  loadBodyMetricChart();
}

async function deletePerformanceLog(id) {
  if (!confirm('Delete this log entry?')) return;
  try {
    await fetch(`${API}/performance/logs/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await Promise.all([loadRecentLogs(), loadPRCards()]);
  } catch (err) { console.error('Failed to delete log', err) }
}
