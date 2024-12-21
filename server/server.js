import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Serve the public directory for client files
app.use(express.static(path.join(__dirname, 'public')));

// Serve node_modules so browser can load from them directly
// (Not recommended for production, but works for development)
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

let players = {};

function randomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

io.on('connection', (socket) => {
  const color = randomColor();
  const startX = (Math.random() * 4) - 2;
  const startZ = (Math.random() * 4) - 2;

  players[socket.id] = { x: startX, z: startZ, color: color };

  // Send current state to the new player
  socket.emit('init', { id: socket.id, players });

  // Broadcast updated state to everyone
  io.emit('state_update', { players });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].z = data.z;
      io.emit('state_update', { players });
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('state_update', { players });
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
