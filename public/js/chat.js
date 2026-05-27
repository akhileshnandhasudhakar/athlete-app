let chatHistory = []
let chatOpen = false

function toggleChat() {
  chatOpen = !chatOpen
  document.getElementById('chat-panel').classList.toggle('open', chatOpen)
  document.getElementById('chat-fab').classList.toggle('active', chatOpen)
  if (chatOpen) setTimeout(() => document.getElementById('chat-input').focus(), 280)
}

function onChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendChatMessage()
  }
}

function appendMessage(role, text) {
  const container = document.getElementById('chat-messages')
  const div = document.createElement('div')
  div.className = `chat-bubble ${role}`
  div.innerHTML = `<div class="chat-bubble-text">${text.replace(/\n/g, '<br>')}</div>`
  container.appendChild(div)
  container.scrollTop = container.scrollHeight
}

function showTyping() {
  const container = document.getElementById('chat-messages')
  const div = document.createElement('div')
  div.className = 'chat-bubble assistant'
  div.id = 'chat-typing'
  div.innerHTML = `<div class="chat-bubble-text typing-dots"><span></span><span></span><span></span></div>`
  container.appendChild(div)
  container.scrollTop = container.scrollHeight
}

function removeTyping() {
  const el = document.getElementById('chat-typing')
  if (el) el.remove()
}

async function sendChatMessage() {
  const input   = document.getElementById('chat-input')
  const sendBtn = document.getElementById('chat-send-btn')
  const message = input.value.trim()
  if (!message || sendBtn.disabled) return

  input.value = ''
  input.style.height = 'auto'
  sendBtn.disabled = true

  appendMessage('user', message)
  showTyping()

  try {
    const res = await fetch(`${API}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, history: chatHistory })
    })
    const data = await res.json()
    removeTyping()
    if (!res.ok) throw new Error(data.error || 'Request failed')

    appendMessage('assistant', data.reply)
    chatHistory.push({ role: 'user', content: message })
    chatHistory.push({ role: 'assistant', content: data.reply })
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20)
  } catch (err) {
    removeTyping()
    appendMessage('assistant', `Sorry, something went wrong: ${err.message}`)
  } finally {
    sendBtn.disabled = false
    input.focus()
  }
}
