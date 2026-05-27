async function loadAchievements() {
  try {
    const res = await fetch(`${API}/achievements`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const { badges } = await res.json()
    renderAchievements(badges)
  } catch (err) {
    console.error('Failed to load achievements', err)
  }
}

function renderAchievements(badges) {
  const grid = document.getElementById('dash-achievements-grid')
  const countEl = document.getElementById('dash-badge-count')
  if (!grid) return

  const earned = badges.filter(b => b.earned).length
  if (countEl) countEl.textContent = `${earned} / ${badges.length}`

  grid.innerHTML = badges.map(b => `
    <div class="badge-item${b.earned ? ' earned' : ' locked'}" title="${b.desc}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
      ${b.earned && b.earnedDate ? `<div class="badge-date">${new Date(b.earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>` : ''}
      ${!b.earned ? `<div class="badge-locked-desc">${b.desc}</div>` : ''}
    </div>`).join('')
}
