const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');

let sessionId = localStorage.getItem('sessionId') || crypto.randomUUID();
localStorage.setItem('sessionId', sessionId);

function addMessage(text, role = 'bot') {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

form.addEventListener('submit', async (e) => {

  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, 'user');
  input.value = '';

  addMessage('...', 'bot');

  try {

    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });
    const data = await res.json();
  
    messagesDiv.lastChild.remove(); // remove '...'
    addMessage(data.finalResponse, 'bot');
  } catch (err) {
    messagesDiv.lastChild.remove();
    addMessage('⚠️ Error: failed to get response', 'bot');
    console.error(err);
  }

});


window.addEventListener('DOMContentLoaded', () => {
    console.log('🪄 Sending initial empty message for greeting');
    fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '', sessionId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.finalResponse) {
        addMessage(data.finalResponse, 'bot');
      }
    })
    .catch(err => {
      console.error('❌ Error loading greeting:', err);
    });
  });