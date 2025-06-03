let verified = false;
let email = '';
let phone = '';

const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

chatInput.addEventListener('input', autoResize);
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  sendMessage('');
});

function autoResize() {
  chatInput.style.height = 'auto';
  chatInput.style.height = chatInput.scrollHeight + 'px';
}

function addMessage(type, text) {
  const msg = document.createElement('div');
  msg.className = type;
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage(inputText) {
  const message = inputText !== undefined ? inputText : chatInput.value.trim();
  if (message !== '') {
    addMessage('user', message);
    chatInput.value = '';
    autoResize();
  }

  // Skip local logic, let backend decide
  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const result = await response.json();
  addMessage('bot', result.answer);
}
