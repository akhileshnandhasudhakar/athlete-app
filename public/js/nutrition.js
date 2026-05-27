let nutrDate = new Date().toISOString().slice(0, 10)
let nutrGoals = null
let stagedItems = []
let foodSearchTimer = null

async function initNutrition() {
  document.getElementById('nutr-date').value = nutrDate
  await loadGoals()
  await loadSummary()
  await loadMeals()
}

document.getElementById('nutr-prev-day').addEventListener('click', () => shiftDay(-1))
document.getElementById('nutr-next-day').addEventListener('click', () => shiftDay(1))
document.getElementById('nutr-date').addEventListener('change', e => {
  nutrDate = e.target.value
  loadSummary(); loadMeals()
})

function shiftDay(delta) {
  const d = new Date(nutrDate + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  nutrDate = d.toISOString().slice(0, 10)
  document.getElementById('nutr-date').value = nutrDate
  loadSummary(); loadMeals()
}

function nutrFetch(path, options = {}) {
  return fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers || {}) }
  }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json() })
}

async function loadGoals() {
  try {
    nutrGoals = await nutrFetch('/nutrition/goals')
    document.getElementById('nutr-goals-banner').style.display = nutrGoals ? 'none' : 'flex'
  } catch { nutrGoals = null }
}

function openGoalsModal() {
  if (nutrGoals) {
    document.getElementById('goal-calories').value = nutrGoals.daily_calories ?? ''
    document.getElementById('goal-protein').value  = nutrGoals.protein_g      ?? ''
    document.getElementById('goal-carbs').value    = nutrGoals.carbs_g        ?? ''
    document.getElementById('goal-fats').value     = nutrGoals.fats_g         ?? ''
  }
  document.getElementById('goals-modal').style.display = 'flex'
}

function closeGoalsModal(e) {
  if (!e || e.target === document.getElementById('goals-modal'))
    document.getElementById('goals-modal').style.display = 'none'
}

async function saveGoals() {
  const body = {
    daily_calories: +document.getElementById('goal-calories').value || null,
    protein_g:      +document.getElementById('goal-protein').value  || null,
    carbs_g:        +document.getElementById('goal-carbs').value    || null,
    fats_g:         +document.getElementById('goal-fats').value     || null,
  }
  try {
    nutrGoals = await nutrFetch('/nutrition/goals', { method: 'POST', body: JSON.stringify(body) })
    document.getElementById('goals-modal').style.display = 'none'
    loadSummary()
  } catch (err) { alert('Failed to save goals: ' + err.message) }
}

async function loadSummary() {
  try {
    const { goals, totals } = await nutrFetch(`/nutrition/summary?date=${nutrDate}`)
    nutrGoals = goals
    const set = (key, value, goal, unit) => {
      const val = Math.round(value) || 0
      document.getElementById(`mv-${key}`).textContent = val + (key === 'calories' ? ' kcal' : 'g')
      document.getElementById(`mg-${key}`).textContent = goal ? `/ ${goal} ${unit}` : unit
      document.getElementById(`mb-${key}`).style.width = (goal ? Math.min((val / goal) * 100, 100) : 0) + '%'
    }
    set('calories', totals.total_calories, goals?.daily_calories, 'kcal')
    set('protein',  totals.total_protein,  goals?.protein_g,      'g')
    set('carbs',    totals.total_carbs,    goals?.carbs_g,         'g')
    set('fats',     totals.total_fats,     goals?.fats_g,          'g')
  } catch {}
}

async function loadMeals() {
  const container = document.getElementById('meals-list')
  container.innerHTML = '<p class="empty-msg">Loading…</p>'
  try {
    const meals = await nutrFetch(`/nutrition/meals?date=${nutrDate}`)
    if (!meals.length) { container.innerHTML = '<p class="empty-msg">No meals logged for this day.</p>'; return }
    container.innerHTML = meals.map(renderMealCard).join('')
  } catch { container.innerHTML = '<p class="empty-msg">Could not load meals.</p>' }
}

function renderMealCard(meal) {
  const sum = (key) => meal.items.reduce((s, i) => s + ((i[key] || 0) * (i.quantity || 1)), 0)
  const rows = meal.items.map(i => `
    <tr>
      <td>${escHtml(i.food_name)}</td>
      <td>${i.quantity}${i.unit ? ' ' + escHtml(i.unit) : ''}</td>
      <td>${Math.round((i.calories || 0) * i.quantity)}</td>
      <td>${((i.protein_g || 0) * i.quantity).toFixed(1)}</td>
      <td>${((i.carbs_g || 0) * i.quantity).toFixed(1)}</td>
      <td>${((i.fats_g || 0) * i.quantity).toFixed(1)}</td>
    </tr>`).join('')
  return `
  <div class="meal-card">
    <div class="meal-card-header">
      <span class="meal-badge ${meal.meal_type}">${meal.meal_type}</span>
      <span class="meal-macros-inline">${Math.round(sum('calories'))} kcal · P ${sum('protein_g').toFixed(1)}g · C ${sum('carbs_g').toFixed(1)}g · F ${sum('fats_g').toFixed(1)}g</span>
      <button class="meal-delete-btn" onclick="deleteMeal(${meal.id})">🗑</button>
    </div>
    <table class="meal-items-table">
      <thead><tr><th>Food</th><th>Qty</th><th>Cal</th><th>Pro</th><th>Carb</th><th>Fat</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${meal.notes ? `<p style="margin:.5rem 1rem .75rem;color:var(--muted);font-size:.8rem">📝 ${escHtml(meal.notes)}</p>` : ''}
  </div>`
}

async function deleteMeal(id) {
  if (!confirm('Delete this meal?')) return
  try { await nutrFetch(`/nutrition/meals/${id}`, { method: 'DELETE' }); loadMeals(); loadSummary() }
  catch (err) { alert('Error: ' + err.message) }
}

function openLogMealModal() {
  stagedItems = []; renderStagedItems()
  document.getElementById('food-search-input').value = ''
  document.getElementById('food-results').style.display = 'none'
  document.getElementById('food-results').innerHTML = ''
  document.getElementById('log-meal-modal').style.display = 'flex'
}

function closeLogMealModal(e) {
  if (!e || e.target === document.getElementById('log-meal-modal'))
    document.getElementById('log-meal-modal').style.display = 'none'
}

function onFoodSearchInput() {
  clearTimeout(foodSearchTimer)
  foodSearchTimer = setTimeout(searchFoods, 500)
}

async function searchFoods() {
  const q = document.getElementById('food-search-input').value.trim()
  if (!q) return
  const resultsEl = document.getElementById('food-results')
  resultsEl.style.display = 'block'
  resultsEl.innerHTML = '<div class="food-result-item"><span style="color:var(--muted)">Searching…</span></div>'
  try {
    const { products } = await nutrFetch(`/foods/search?q=${encodeURIComponent(q)}`)
    if (!products.length) { resultsEl.innerHTML = '<div class="food-result-item"><span style="color:var(--muted)">No results.</span></div>'; return }
    window._foodResults = products
    resultsEl.innerHTML = products.map((p, idx) => `
      <div class="food-result-item" onclick="addFoodResult(${idx})">
        <div>
          <div class="food-result-name">${escHtml(p.name)}</div>
          ${p.brand ? `<div class="food-result-brand">${escHtml(p.brand)}</div>` : ''}
        </div>
        <div class="food-result-macros">
          ${p.per100g.calories != null ? Math.round(p.per100g.calories) + ' kcal' : ''}
          ${p.per100g.protein != null ? '· P ' + p.per100g.protein.toFixed(1) + 'g' : ''}<br>
          <span style="color:var(--muted);font-size:.7rem">${escHtml(p.serving || 'per 100g')}</span>
        </div>
      </div>`).join('')
  } catch { resultsEl.innerHTML = '<div class="food-result-item"><span style="color:var(--danger)">Search failed.</span></div>' }
}

function addFoodResult(idx) {
  const p = window._foodResults[idx]
  stagedItems.push({ food_name: p.name, calories: p.per100g.calories, protein_g: p.per100g.protein, carbs_g: p.per100g.carbs, fats_g: p.per100g.fats, quantity: 100, unit: 'g' })
  renderStagedItems()
  document.getElementById('food-results').style.display = 'none'
  document.getElementById('food-search-input').value = ''
}

function addManualItem() {
  const name = document.getElementById('me-name').value.trim()
  if (!name) { alert('Food name is required.'); return }
  stagedItems.push({
    food_name: name,
    calories:  +document.getElementById('me-calories').value || null,
    protein_g: +document.getElementById('me-protein').value  || null,
    carbs_g:   +document.getElementById('me-carbs').value    || null,
    fats_g:    +document.getElementById('me-fats').value     || null,
    quantity:  +document.getElementById('me-qty').value  || 1,
    unit:       document.getElementById('me-unit').value.trim() || null,
  })
  renderStagedItems()
  ;['me-name', 'me-qty', 'me-unit', 'me-calories', 'me-protein', 'me-carbs', 'me-fats']
    .forEach(id => { document.getElementById(id).value = id === 'me-qty' ? '1' : '' })
}

function removeStagedItem(idx) { stagedItems.splice(idx, 1); renderStagedItems() }

function renderStagedItems() {
  const el = document.getElementById('staged-items')
  if (!stagedItems.length) { el.innerHTML = '<p class="empty-msg">No items added yet.</p>'; return }
  el.innerHTML = stagedItems.map((item, i) => `
    <div class="staged-item">
      <div>
        <span class="staged-item-name">${escHtml(item.food_name)}</span>
        <span style="color:var(--muted)"> ×${item.quantity}${item.unit ? ' ' + escHtml(item.unit) : ''}</span><br>
        <span class="staged-item-macros">
          ${item.calories != null ? Math.round(item.calories * item.quantity) + ' kcal' : ''}
          ${item.protein_g != null ? '· P ' + (item.protein_g * item.quantity).toFixed(1) + 'g' : ''}
          ${item.carbs_g != null ? '· C ' + (item.carbs_g * item.quantity).toFixed(1) + 'g' : ''}
          ${item.fats_g != null ? '· F ' + (item.fats_g * item.quantity).toFixed(1) + 'g' : ''}
        </span>
      </div>
      <button class="staged-remove" onclick="removeStagedItem(${i})">✕</button>
    </div>`).join('')
}

async function saveMeal() {
  if (!stagedItems.length) { alert('Add at least one food item.'); return }
  const body = {
    date:      nutrDate,
    meal_type: document.getElementById('lm-meal-type').value,
    notes:     document.getElementById('lm-notes').value.trim() || null,
    items:     stagedItems
  }
  try {
    await nutrFetch('/nutrition/meals', { method: 'POST', body: JSON.stringify(body) })
    document.getElementById('log-meal-modal').style.display = 'none'
    await loadMeals(); await loadSummary()
  } catch (err) { alert('Failed to save meal: ' + err.message) }
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
