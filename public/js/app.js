const API = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin
let token = localStorage.getItem('athlete_token') || null
let exercises = []
let sessionTypes = []

const SPORT_STATS = {
  Basketball: [{key:'points',label:'Points'},{key:'rebounds',label:'Rebounds'},{key:'assists',label:'Assists'},{key:'steals',label:'Steals'},{key:'blocks',label:'Blocks'}],
  Baseball: [{key:'at_bats',label:'At Bats'},{key:'hits',label:'Hits'},{key:'runs',label:'Runs'},{key:'rbi',label:'RBI'},{key:'strikeouts',label:'Strikeouts'},{key:'innings_pitched',label:'Innings Pitched'}],
  Cricket: [{key:'runs_scored',label:'Runs Scored'},{key:'balls_faced',label:'Balls Faced'},{key:'wickets',label:'Wickets'},{key:'overs_bowled',label:'Overs Bowled'},{key:'catches',label:'Catches'}],
  Football: [{key:'touchdowns',label:'Touchdowns'},{key:'passing_yards',label:'Passing Yards'},{key:'rushing_yards',label:'Rushing Yards'},{key:'tackles',label:'Tackles'},{key:'sacks',label:'Sacks'}],
  Soccer: [{key:'goals',label:'Goals'},{key:'assists',label:'Assists'},{key:'shots',label:'Shots'},{key:'saves',label:'Saves'},{key:'yellow_cards',label:'Yellow Cards'}]
}

// ── Utilities ─────────────────────────────────────────────────────────────
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id)
  el.textContent = msg
  el.className = `alert alert-${type} show`
  if (type === 'success') setTimeout(() => el.classList.remove('show'), 3000)
}
function clearAlert(id) { document.getElementById(id).classList.remove('show') }
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.getElementById('view-' + name).classList.add('active')
}
function setLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId)
  btn.disabled = loading
  btn.innerHTML = loading ? '<span class="spinner"></span>Loading' : label
}

// ── Navigation ────────────────────────────────────────────────────────────
function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'))
  document.getElementById('panel-' + name).classList.add('active')
  const tab = document.querySelector(`.nav-tab[data-panel="${name}"]`)
  if (tab) tab.classList.add('active')
  if (name === 'dashboard') loadDashboard()
  if (name === 'workouts') switchWorkoutTab('log')
  if (name === 'nutrition') initNutrition()
  if (name === 'health') { loadHealthStatus(); loadHealthData() }
  if (name === 'performance') initPerformanceTab()
  if (name === 'goals') initGoalsTab()
  if (name === 'calendar') initCalendarPanel()
}

function switchWorkoutTab(tab) {
  document.querySelectorAll('.wkt-sub-panel').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.wkt-sub-tab').forEach(t => t.classList.remove('active'))
  document.getElementById('wkt-' + tab).classList.add('active')
  const idx = ['log', 'history', 'programs', 'ai'].indexOf(tab)
  if (idx !== -1) document.querySelectorAll('.wkt-sub-tab')[idx].classList.add('active')
  if (tab === 'history') { loadWorkoutHistory(); loadAnalytics() }
  if (tab === 'programs') initProgramsTab()
}

function switchTab(tab) {
  clearAlert('alert-auth')
  document.getElementById('tab-login').classList.toggle('active', tab === 'login')
  document.getElementById('tab-register').classList.toggle('active', tab === 'register')
  document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none'
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none'
}

// ── Auth ──────────────────────────────────────────────────────────────────
async function handleLogin() {
  clearAlert('alert-auth')
  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  if (!email || !password) return showAlert('alert-auth', 'Please fill in all fields.')
  setLoading('btn-login', true)
  try {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'Login failed')
    token = data.token
    localStorage.setItem('athlete_token', token)
    await loadProfile()
  } catch (e) { showAlert('alert-auth', e.message) }
  finally { setLoading('btn-login', false, 'Login') }
}

async function handleRegister() {
  clearAlert('alert-auth')
  const email = document.getElementById('reg-email').value.trim()
  const password = document.getElementById('reg-password').value
  if (!email || !password) return showAlert('alert-auth', 'Please fill in all fields.')
  if (password.length < 6) return showAlert('alert-auth', 'Password must be at least 6 characters.')
  setLoading('btn-register', true)
  try {
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'Registration failed')
    token = data.token
    localStorage.setItem('athlete_token', token)
    showView('setup')
  } catch (e) { showAlert('alert-auth', e.message) }
  finally { setLoading('btn-register', false, 'Create Account') }
}

function handleLogout() {
  localStorage.removeItem('athlete_token')
  token = null
  switchTab('login')
  document.getElementById('login-email').value = ''
  document.getElementById('login-password').value = ''
  showView('auth')
}

// ── Profile ───────────────────────────────────────────────────────────────
async function handleSaveProfile() {
  clearAlert('alert-setup')
  const full_name = document.getElementById('setup-name').value.trim()
  const sport = document.getElementById('setup-sport').value
  const age = parseInt(document.getElementById('setup-age').value)
  const height_cm = parseFloat(document.getElementById('setup-height').value)
  const weight_kg = parseFloat(document.getElementById('setup-weight').value)
  if (!full_name || !sport || !age || !height_cm || !weight_kg) return showAlert('alert-setup', 'Please fill in all fields.')
  setLoading('btn-save-profile', true)
  try {
    const res = await fetch(`${API}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ full_name, sport, age, height_cm, weight_kg }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'Could not save profile')
    renderProfile(data.profile || data)
    showView('main')
  } catch (e) { showAlert('alert-setup', e.message) }
  finally { setLoading('btn-save-profile', false, 'Save Profile') }
}

async function loadProfile() {
  try {
    const res = await fetch(`${API}/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
    if (res.status === 404) { showView('setup'); return }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Could not load profile')
    renderProfile(data.profile || data)
    showView('main')
  } catch (e) { showView('setup') }
}

function renderProfile(p) {
  const initials = (p.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  // Dashboard profile card
  const dashAvatar = document.getElementById('dash-avatar')
  if (dashAvatar) { dashAvatar.textContent = initials }
  const dashName = document.getElementById('dash-name')
  if (dashName) { dashName.textContent = p.full_name || '—' }
  const dashSport = document.getElementById('dash-sport')
  if (dashSport) { dashSport.textContent = p.sport || '—' }
  // Profile panel
  document.getElementById('profile-avatar').textContent = initials
  document.getElementById('profile-name').textContent = p.full_name || '—'
  document.getElementById('profile-sport').textContent = p.sport || '—'
  document.getElementById('stat-age').textContent = p.age || '—'
  document.getElementById('stat-height').textContent = p.height_cm || '—'
  document.getElementById('stat-weight').textContent = p.weight_kg ? parseFloat(p.weight_kg).toFixed(1) : '—'
  if (p.created_at) {
    const d = new Date(p.created_at)
    document.getElementById('profile-joined').textContent = 'Member since ' + d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }
  const logSport = document.getElementById('log-sport')
  if (p.sport && [...logSport.options].some(o => o.value === p.sport)) {
    logSport.value = p.sport
    renderSportStats(p.sport)
    loadSessionTypes(p.sport)
  }
}

// ── Init ──────────────────────────────────────────────────────────────────
document.getElementById('log-date').value = new Date().toISOString().split('T')[0]
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !document.getElementById('view-auth').classList.contains('active')) return
  document.getElementById('form-login').style.display !== 'none' ? handleLogin() : handleRegister()
})
;(async () => { token ? await loadProfile() : showView('auth') })()
