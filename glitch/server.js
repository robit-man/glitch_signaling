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

    socket.on('player_joined', (data) => {
        console.log(`Player joined: ${socket.id}`, data);

        // Use the data sent by the client to initialize the player
        players[socket.id] = {
            x: data.x,
            z: data.z,
            rotation: data.rotation,
            color: getRandomColor(), // Assign a random color
        };

        // Send initial state to the new client
        socket.emit('init', { id: socket.id, players });

        // Notify other clients about the new player
        socket.broadcast.emit('new_player', {
            id: socket.id,
            x: players[socket.id].x,
            z: players[socket.id].z,
            rotation: players[socket.id].rotation,
            color: players[socket.id].color,
        });
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
  

  // Handle 'start_audio' events from clients
  socket.on('start_audio', () => {
    console.log(`User ${socket.id} started broadcasting audio.`);
    socket.broadcast.emit('start_audio', socket.id);
  });

  // Handle 'stop_audio' events from clients
  socket.on('stop_audio', () => {
    console.log(`User ${socket.id} stopped broadcasting audio.`);
    socket.broadcast.emit('stop_audio', socket.id);
  });

  // Handle 'audio_stream' events from clients
  socket.on('audio_stream', (data) => {
    // Broadcast the audio data to all other clients, tagging with the sender's ID
    socket.broadcast.emit('audio_stream', { id: socket.id, audio: data });
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
