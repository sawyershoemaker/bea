document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const consoleLogList = document.getElementById('consoleLogList');
  const saveConsoleLogBtn = document.getElementById('saveConsoleLog');
  const notification = document.getElementById('notification');

  // fetch initial console logs from server.
  fetch('/api/consoleLog')
    .then(res => res.json())
    .then(data => {
      data.logs.forEach(msg => {
        const li = document.createElement('li');
        li.textContent = msg;
        consoleLogList.appendChild(li);
      });
      consoleLogList.scrollTop = consoleLogList.scrollHeight;
    });

  // listen for live updates.
  socket.on('consoleLog', (msg) => {
    const li = document.createElement('li');
    li.textContent = msg;
    consoleLogList.appendChild(li);
    consoleLogList.scrollTop = consoleLogList.scrollHeight;
  });

  // save log button functionality.
  saveConsoleLogBtn.addEventListener('click', () => {
    fetch('/saveConsoleLog', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
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
