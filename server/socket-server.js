const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('join', (room) => {
    if (room) socket.join(room);
  });
});

app.post('/emit', (req, res) => {
  try {
    const { event, data, room } = req.body || {};
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('Emit failed', e);
    return res.status(500).json({ ok: false, error: 'Emit failed' });
  }
});

const PORT = process.env.SOCKET_PORT || 4001;
server.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
});