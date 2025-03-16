document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const fullChatLogEl = document.getElementById('fullChatLog');
  const saveChatLogBtn = document.getElementById('saveChatLog');
  const notification = document.getElementById('notification');
  let botUsername = "";

  // capture bot info.
  socket.on('botInfo', (data) => {
    botUsername = data.username;
  });

  // fetch initial full chat log from server.
  fetch('/api/chatLog')
    .then(res => res.json())
    .then(data => {
      data.logs.forEach(msg => {
        const li = document.createElement('li');
        if (botUsername && msg.toLowerCase().includes(botUsername.toLowerCase()) && !msg.startsWith(botUsername + ':')) {
          li.classList.add('highlight');
        }
        li.textContent = msg;
        fullChatLogEl.appendChild(li);
      });
      fullChatLogEl.scrollTop = fullChatLogEl.scrollHeight;
    });

  // listen for live updates.
  socket.on('chat', (msg) => {
    const li = document.createElement('li');
    if (botUsername && msg.toLowerCase().includes(botUsername.toLowerCase()) && !msg.startsWith(botUsername + ':')) {
      li.classList.add('highlight');
    }
    li.textContent = msg;
    fullChatLogEl.appendChild(li);
    fullChatLogEl.scrollTop = fullChatLogEl.scrollHeight;
  });

  // save log button functionality.
  saveChatLogBtn.addEventListener('click', () => {
    fetch('/saveChatLog', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(res => res.json())
      .then(data => {
        showNotification(data.message);
      });
  });

  // function to show an animated notification.
  function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
});