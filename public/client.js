// client.js
document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
  
    const botUsernameEl = document.getElementById('botUsername');
    const botSkinEl = document.getElementById('botSkin');
    const chatLogEl = document.getElementById('chatLog');
    const botResponsesEl = document.getElementById('botResponses');
  
    const toggleChatBtn = document.getElementById('toggleChat');
    const toggleAntiAfkBtn = document.getElementById('toggleAntiAfk');
    const stopBotBtn = document.getElementById('stopBot');
    const sendMessageBtn = document.getElementById('sendMessage');
    const messageInput = document.getElementById('messageInput');
    const viewFullChatBtn = document.getElementById('viewFullChat');
    const viewConsoleBtn = document.getElementById('viewConsole');
  
    let recentChats = [];
    let botUsername = '';
    let stopConfirmed = false;
  
    // receive bot info from server.
    socket.on('botInfo', (data) => {
      botUsername = data.username;
      botUsernameEl.textContent = "Username: " + botUsername;
      botSkinEl.src = "https://mc-heads.net/avatar/" + botUsername + "/100";
    });
  
    // append incoming chat messages (rotating log of 10 messages) with highlight if mentioning the bot.
    socket.on('chat', (msg) => {
      const lowerMsg = msg.toLowerCase();
      const lowerUsername = botUsername.toLowerCase();
      // highlight if message includes the bot's username and isn't from the bot.
      const isMention = lowerMsg.includes(lowerUsername) && !msg.startsWith(botUsername + ':');
      
      recentChats.push({ text: msg, highlight: isMention });
      if (recentChats.length > 5) {
        recentChats.shift();
      }
      updateChatLog();
    });
  
    // append bot responses.
    socket.on('botResponse', (msg) => {
      const li = document.createElement('li');
      li.textContent = msg;
      botResponsesEl.appendChild(li);
    });
  
    function updateChatLog() {
      chatLogEl.innerHTML = '';
      recentChats.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = entry.text;
        if (entry.highlight) {
          li.classList.add('highlight');
        }
        chatLogEl.appendChild(li);
      });
    }
  
    // toggle chat processing.
    toggleChatBtn.addEventListener('click', () => {
      fetch('/toggle/chat', { method: 'POST', headers: {'Content-Type': 'application/json'} })
        .then(res => res.json())
        .then(data => {
          if (data.chatPaused) {
            toggleChatBtn.classList.remove('active');
            toggleChatBtn.classList.add('inactive');
          } else {
            toggleChatBtn.classList.remove('inactive');
            toggleChatBtn.classList.add('active');
          }
        });
    });
  
    // toggle anti-AFK processing.
    toggleAntiAfkBtn.addEventListener('click', () => {
      fetch('/toggle/antiAfk', { method: 'POST', headers: {'Content-Type': 'application/json'} })
        .then(res => res.json())
        .then(data => {
          if (data.antiAfkPaused) {
            toggleAntiAfkBtn.classList.remove('active');
            toggleAntiAfkBtn.classList.add('inactive');
          } else {
            toggleAntiAfkBtn.classList.remove('inactive');
            toggleAntiAfkBtn.classList.add('active');
          }
        });
    });
  
    socket.on('botInfo', (data) => {
      botUsername = data.username;
      botUsernameEl.textContent = "Username: " + botUsername;
      botSkinEl.src = "https://mc-heads.net/avatar/" + botUsername + "/100";
      // set favicon dynamically.
      const favicon = document.getElementById('favicon');
      if (favicon) {
        favicon.href = "https://mc-heads.net/avatar/" + botUsername + "/16";
      }
    });

    // stop the bot
    stopBotBtn.addEventListener('click', (e) => {
      // prevent the click from propagating to the document listener.
      e.stopPropagation();
      if (!stopConfirmed) {
        stopConfirmed = true;
        stopBotBtn.textContent = "Confirm";
        stopBotBtn.style.backgroundColor = "#ff8800";
      } else {
        // on confirm, completely black out the page.
        document.body.innerHTML = "";
        document.body.style.backgroundColor = "black";
        // call the stop endpoint to kill the bot.
        fetch('/stop', { method: 'POST', headers: {'Content-Type': 'application/json'} });
      }
    });

    document.addEventListener('click', (e) => {
      if (stopConfirmed && e.target !== stopBotBtn) {
        stopConfirmed = false;
        stopBotBtn.textContent = "Stop Bot";
        stopBotBtn.style.backgroundColor = "";
      }
    });
  
    // send a message from the bot.
    sendMessageBtn.addEventListener('click', () => {
      const message = messageInput.value;
      if (!message) return;
      fetch('/say', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      }).then(() => {
        messageInput.value = '';
      });
    });
  
    // open full chat log in new tab.
    viewFullChatBtn.addEventListener('click', () => {
      window.open('/fullLog.html', '_blank');
    });
  
    // open console log in new tab.
    viewConsoleBtn.addEventListener('click', () => {
      window.open('/consoleLog.html', '_blank');
    });
  });
  