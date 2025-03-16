require('dotenv').config();

process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('passengers')) {
    console.error("Caught 'passengers' error, ignoring:", err.message);
  } else {
    console.error("Unhandled Exception:", err);
    process.exit(1);
  }
});

const mineflayer = require('mineflayer');
const antiAfk = require('./antiAfk');
const axios = require('axios');
const { Worker } = require('worker_threads');

const username = 'aegiya';

const bot = mineflayer.createBot({
  host: 'mc.hypixel.net', 
  username: username,
  auth: 'microsoft',
  version: '1.8.9',
});

// start the web interface (on port 1024)
require('./webserver')(bot);

// create a worker thread that handles chat processing and OpenAI API calls
const chatWorker = new Worker('./chatWorker.js', {
  workerData: { username: username, openaiApiKey: process.env.OPENAI_API_KEY }
});

chatWorker.on('message', (data) => {
  if (typeof data === "object" && data.type === "log") {
    console.log("ChatWorker:", data.message);
  } else {
    console.log("Worker reply:", data);
    bot.chat(data);
    bot.emit('botResponse', data);
  }
});

chatWorker.on('error', (err) => {
  console.error("Chat worker error:", err);
});

chatWorker.on('exit', (code) => {
  console.log("Chat worker exited with code:", code);
});

// Anti-AFK scheduler (only run if not paused)
setInterval(() => {
  if (!bot.antiAfkPaused) {
    antiAfk(bot);
  }
}, 30000);

// bot spawn & initial commands
bot.once('spawn', () => {
  console.log('Bot spawned.');
  
  setTimeout(() => {
    console.log("Running command: /bedwars");
    bot.chat('/bedwars');

    setTimeout(() => {
      console.log("Running command: /swaplobby 1");
      bot.chat('/swaplobby 1');
      handleLobbySwap();
    }, 10000);
    
  }, 5000);
});

// lobby swap response handler
function handleLobbySwap() {
  let responseReceived = false;
  
  const lobbyListener = (message) => {
    const msg = message.toString();
    if (msg.includes("Sending you to bedwarslobby1")) {
      responseReceived = true;
      console.log("Received: Sending you to bedwarslobby1");
    } else if (msg.includes("This server is full!")) {
      console.log("Received: This server is full! Retrying in 5 seconds...");
      cleanupListener();
      setTimeout(() => {
        console.log("Running command: /swaplobby 1");
        bot.chat('/swaplobby 1');
        handleLobbySwap();
      }, 5000);
    } else if (msg.includes("Woah there, slow down!")) {
      console.log("Received: Woah there, slow down! Retrying in 30 seconds...");
      cleanupListener();
      setTimeout(() => {
        console.log("Running command: /swaplobby 1");
        bot.chat('/swaplobby 1');
        handleLobbySwap();
      }, 30000);
    }
  };

  function cleanupListener() {
    bot.removeListener('message', lobbyListener);
    clearTimeout(timeout);
  }

  bot.on('message', lobbyListener);

  const timeout = setTimeout(() => {
    if (responseReceived) {
      console.log("Lobby 1 confirmed.");
      cleanupListener();
      startChatListener();
    }
  }, 3000);
}

// when in lobby, forward each chat message to the worker thread
// check the chatPaused flag before processing messages.
function startChatListener() {
  bot.on('message', (message) => {
    let msgStr = message.toString();
    
    // renove any leading square-bracket tags (stars/ranks)
    while (/^\[[^\]]+\]\s*/.test(msgStr)) {
      msgStr = msgStr.replace(/^\[[^\]]+\]\s*/, '');
    }
    
    // filter out own messages.
    if (msgStr.startsWith(username + ': ')) {
      return;
    }
    
    // filter out messages containing a numeric pattern (e.g., "3/4 vc").
    if (/\d+\/\d+/.test(msgStr)) {
      return;
    }
    
    // filter out lobby join messages.
    if (msgStr.toLowerCase().includes("joined the lobby!")) {
      return;
    }
    
    // only forward to the chat worker if chat is enabled.
    if (!bot.chatPaused) {
      chatWorker.postMessage({ type: 'chat', message: msgStr });
    }
  });
}

bot.on('error', (err) => {
  console.error("Bot encountered an error:", err);
});
bot.on('end', () => {
  console.log("Bot has disconnected.");
});