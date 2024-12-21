// Import necessary modules
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io server with CORS restrictions
const io = new Server(server, {
  cors: {
    origin: '*', // Replace with your production site URL for security
    methods: ['GET', 'POST']
  }
});

// Initialize players object to keep track of connected players
const players = {};

// Function to generate a random color for new players
function getRandomColor() {
  return Math.floor(Math.random() * 0xffffff);
}

// Listen for client connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Add the new player to the players object
  players[socket.id] = {
    x: 0,          // Initial X position
    z: 0,          // Initial Z position
    rotation: 0,   // Initial rotation
    color: getRandomColor() // Assign a random color
  };

  // Send 'init' event to the newly connected client with current players
  socket.emit('init', { id: socket.id, players });

  // Notify existing clients about the new player
  socket.broadcast.emit('new_player', {
    id: socket.id,
    x: players[socket.id].x,
    z: players[socket.id].z,
    rotation: players[socket.id].rotation,
    color: players[socket.id].color
  });

  // Handle 'move' events from clients
  socket.on('move', (data) => {
    if (players[socket.id]) {
      // Update the player's position and rotation
      players[socket.id].x = data.x;
      players[socket.id].z = data.z;
      players[socket.id].rotation = data.rotation;

      // Optional: Update color if provided
      if (data.color) {
        players[socket.id].color = data.color;
      }

      // Broadcast the updated state to other clients
      socket.broadcast.emit('state_update', {
        id: socket.id,
        x: data.x,
        z: data.z,
        rotation: data.rotation
      });
    }
  });

  // Handle 'key_down' events from clients
  socket.on('key_down', (data) => {
    // Broadcast to all other clients that this player has pressed a key
    socket.broadcast.emit('key_down', { id: socket.id, key: data.key });
  });

  // Handle 'key_up' events from clients
  socket.on('key_up', (data) => {
    // Broadcast to all other clients that this player has released a key
    socket.broadcast.emit('key_up', { id: socket.id, key: data.key });
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove the player from the players object
    delete players[socket.id];

    // Notify remaining clients about the disconnection
    socket.broadcast.emit('player_disconnected', socket.id);
  });
});

// Periodically broadcast all players' states to all clients
const BROADCAST_INTERVAL = 1000 / 60; // 60 times per second

setInterval(() => {
  io.emit('state_update_all', players);
}, BROADCAST_INTERVAL);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server is running on port ${PORT}`);
});
