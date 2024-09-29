const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:3000', // Origem do frontend
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    }
});

app.use(cors({
    origin: 'http://localhost:3000', // Origem do frontend
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('createRoom', (room) => {
        if (!rooms[room]) {
            rooms[room] = {};
        }
        socket.join(room);
        console.log(`Room created: ${room}`);
    });

    socket.on('joinRoom', ({ room, playerName }) => {
        if (!rooms[room]) {
            rooms[room] = {};
        }
        socket.join(room);

        const canvasHeight = 500; // altura do canvas
        const margin = 50; // margem inferior
        const spacing = 10; // espaçamento vertical entre os jogadores
        const playersInRoom = Object.keys(rooms[room]).length;

        const initialX = 10;
        const initialY = canvasHeight - margin - playersInRoom * spacing; // Calcula a posição inicial y

        rooms[room][socket.id] = { name: playerName, x: initialX, y: initialY }; // Inicializa a position
        console.log(`User ${playerName} joined room: ${room}`);
        io.to(room).emit('updatePlayers', rooms[room]);
    });

    socket.on('control', (data) => {
        if (rooms[data.room] && rooms[data.room][socket.id]) {
            const player = rooms[data.room][socket.id];
            if (data.direction === 'left') player.x -= 5;
            if (data.direction === 'right') player.x += 5;
            if (data.direction === 'up') player.y -= 5;
            if (data.direction === 'down') player.y += 5;

            io.to(data.room).emit('updatePlayers', rooms[data.room]);

            // Verifica se o jogador chegou no limite
            if (player.y <= 0) { // Ajuste o valor para corresponder à largura do canvas
                io.to(data.room).emit('announceWinner', player.name);
            }
        }
    });

    socket.on('winner', (data) => {
        io.to(data.room).emit('announceWinner', data.playerName);
    });

    socket.on('disconnect', () => {
        for (const room in rooms) {
            if (rooms[room][socket.id]) {
                delete rooms[room][socket.id];
                io.to(room).emit('updatePlayers', rooms[room]);
            }
        }
        console.log('user disconnected');
    });

    socket.on("restartGame", (room) => {
        // Lógica para reiniciar o jogo e resetar posições dos jogadores
        const canvasHeight = 600; // altura do canvas
        const margin = 50; // margem inferior
        const spacing = 60; // espaçamento vertical entre os jogadores

        const playersInRoom = rooms[room] || {};
        let i = 0;
        for (const playerId in playersInRoom) {
            playersInRoom[playerId].x = 10; // Posição inicial x
            playersInRoom[playerId].y = canvasHeight - margin - i * spacing; // Calcula a posição inicial y
            i++;
        }
        io.to(room).emit("updatePlayers", playersInRoom);
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
