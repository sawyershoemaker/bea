const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

module.exports = function(bot) {
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server);

  // bot toggle flags.
  bot.chatPaused = false;
  bot.antiAfkPaused = false;

  // in-memory logs.
  const fullChatLog = [];
  const fullConsoleLog = [];

  // create a logs folder if it doesn't exist.
  const logsFolder = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsFolder)) {
    fs.mkdirSync(logsFolder);
  }
  
  // generate filenames that include the Unix timestamp.
  const timestamp = Date.now();
  const chatLogPath = path.join(logsFolder, `chat_${timestamp}.log`);
  const consoleLogPath = path.join(logsFolder, `console_${timestamp}.log`);

  // flags to track if user has saved logs.
  let chatLogSaved = false;
  let consoleLogSaved = false;

  // create/clear log files on startup.
  fs.writeFileSync(chatLogPath, '');
  fs.writeFileSync(consoleLogPath, '');

  app.use(express.static('public'));
  app.use(express.json());

  // override console.log to capture logs in memory and file.
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    fullConsoleLog.push(message);
    fs.appendFileSync(consoleLogPath, message + '\n');
    io.emit('consoleLog', message);
    originalLog.apply(console, args);
  };

  // api endpoint to retrieve full console logs.
  app.get('/api/consoleLog', (req, res) => {
    res.json({ logs: fullConsoleLog });
  });

  // api endpoint to retrieve full chat log.
  app.get('/api/chatLog', (req, res) => {
    res.json({ logs: fullChatLog });
  });

  // endpoints for saving logs.
  app.post('/saveChatLog', (req, res) => {
    chatLogSaved = true;
    res.json({ status: 'ok', message: 'Log will be saved.' });
  });

  app.post('/saveConsoleLog', (req, res) => {
    consoleLogSaved = true;
    res.json({ status: 'ok', message: 'Log will be saved.' });
  });

  // toggle chat processing.
  app.post('/toggle/chat', (req, res) => {
    bot.chatPaused = !bot.chatPaused;
    res.json({ chatPaused: bot.chatPaused });
    io.emit('toggleUpdate', { chatPaused: bot.chatPaused });
  });

  // toggle anti-AFK actions.
  app.post('/toggle/antiAfk', (req, res) => {
    bot.antiAfkPaused = !bot.antiAfkPaused;
    res.json({ antiAfkPaused: bot.antiAfkPaused });
    io.emit('toggleUpdate', { antiAfkPaused: bot.antiAfkPaused });
  });

  // endpoint to send a chat message.
  app.post('/say', (req, res) => {
    const message = req.body.message;
    if (message) {
      bot.chat(message);
      res.json({ status: 'ok', message });
    } else {
      res.status(400).json({ status: 'error', error: 'No message provided' });
    }
  });

  // stop the bot.
  app.post('/stop', (req, res) => {
    res.json({ status: 'ok', message: 'Bot is stopping' });
    // delete log files if not saved.
    if (!chatLogSaved && fs.existsSync(chatLogPath)) {
      fs.unlinkSync(chatLogPath);
    }
    if (!consoleLogSaved && fs.existsSync(consoleLogPath)) {
      fs.unlinkSync(consoleLogPath);
    }
    process.exit(0);
  });

  io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('botInfo', { username: bot.username });
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  // broadcast each chat message and store in full log and file.
  bot.on('message', (message) => {
    const msgStr = message.toString();
    fullChatLog.push(msgStr);
    fs.appendFileSync(chatLogPath, msgStr + '\n');
    io.emit('chat', msgStr);
  });

  // broadcast bot responses.
  bot.on('botResponse', (message) => {
    io.emit('botResponse', message);
  });

  server.listen(1024, () => {
    console.log('Web interface listening on http://localhost:1024');
  });
};